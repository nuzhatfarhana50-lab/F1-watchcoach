import { AiGenerationError } from "./errors";
import type { ExplanationCache, ExplanationGenerator, GenerationRecorder, GroundingRetriever } from "./ports";
import { groundedExplanationSchema, type GroundedExplanation, type GroundingContext } from "./schemas";

export type GroundedExplanationResult = {
  output: GroundedExplanation;
  source: "generated" | "cache" | "curatedFallback";
};

export class GroundedExplanationService {
  constructor(
    private readonly retriever: GroundingRetriever,
    private readonly generator: ExplanationGenerator,
    private readonly cache: ExplanationCache,
    private readonly recorder: GenerationRecorder,
    private readonly promptVersion = "grounded-explanation-v1",
  ) {}

  async explain(momentId: string): Promise<GroundedExplanationResult> {
    const context = await this.retriever.retrieve(momentId);
    if (!context || context.evidence.length === 0 || context.sources.length === 0) {
      throw new AiGenerationError("insufficientEvidence", "Grounded explanation context is incomplete");
    }

    const key = `${this.promptVersion}:${momentId}`;
    const cached = await this.cache.get(key);
    if (cached) return { output: cached, source: "cache" };

    try {
      const generation = await this.generator.generate(context);
      const parsed = groundedExplanationSchema.safeParse(generation.output);
      if (!parsed.success) throw new AiGenerationError("invalidOutput", "Generated explanation failed schema validation");
      this.assertReferences(parsed.data, context);
      await this.cache.set(key, parsed.data);
      await this.recorder.record({
        idempotencyKey: key,
        momentId,
        output: parsed.data,
        metadata: generation.metadata,
        status: "validated",
      });
      return { output: parsed.data, source: "generated" };
    } catch (error) {
      if (error instanceof AiGenerationError && error.kind === "insufficientEvidence") throw error;
      await this.recorder.record({
        idempotencyKey: key,
        momentId,
        output: context.curatedFallback,
        metadata: {
          generationId: `fallback:${momentId}`,
          model: "curated",
          promptVersion: this.promptVersion,
          createdAt: new Date().toISOString(),
        },
        status: "fallback",
      });
      return { output: context.curatedFallback, source: "curatedFallback" };
    }
  }

  private assertReferences(output: GroundedExplanation, context: GroundingContext) {
    const conceptIds = new Set(context.concepts.map((concept) => concept.id));
    const momentIds = new Set(context.candidateMoments.map((moment) => moment.id));
    const sourceIds = new Set(context.sources.map((source) => source.id));
    const valid = output.conceptIds.every((id) => conceptIds.has(id))
      && output.relatedMomentIds.every((id) => momentIds.has(id))
      && output.citedSourceIds.every((id) => sourceIds.has(id));
    if (!valid) throw new AiGenerationError("ungroundedReferences", "Generated output referenced an unknown application ID");
  }
}

export class InMemoryExplanationCache implements ExplanationCache {
  private readonly values = new Map<string, GroundedExplanation>();
  async get(key: string) { return this.values.get(key) ?? null; }
  async set(key: string, value: GroundedExplanation) { this.values.set(key, value); }
}

export class InMemoryGenerationRecorder implements GenerationRecorder {
  readonly records = new Map<string, Parameters<GenerationRecorder["record"]>[0]>();
  async record(input: Parameters<GenerationRecorder["record"]>[0]) { this.records.set(input.idempotencyKey, input); }
}
