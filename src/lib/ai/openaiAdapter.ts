import { randomUUID } from "node:crypto";
import { z } from "zod";

import { AiGenerationError } from "./errors";
import type { ConceptClassifier, ConnectionGenerator, EmbeddingGenerator, ExplanationGenerator } from "./ports";
import { conceptClassificationJsonSchema, connectionDiscoveryJsonSchema, groundedExplanationJsonSchema, type GroundingContext } from "./schemas";

const responseSchema = z.object({
  id: z.string().min(1),
  model: z.string().min(1),
  created_at: z.number().optional(),
  output: z.array(z.object({
    type: z.string(),
    content: z.array(z.object({ type: z.string(), text: z.string().optional() }).passthrough()).optional(),
  }).passthrough()),
}).passthrough();

const embeddingResponseSchema = z.object({
  model: z.string().min(1),
  data: z.array(z.object({ index: z.number().int(), embedding: z.array(z.number()) })),
});

export class OpenAiAdapter implements ExplanationGenerator, EmbeddingGenerator, ConceptClassifier, ConnectionGenerator {
  constructor(
    private readonly apiKey: string,
    private readonly generationModel = "gpt-5-mini",
    private readonly embeddingModel = "text-embedding-3-small",
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  async generate(context: GroundingContext) {
    const response = await this.request("/v1/responses", {
      model: this.generationModel,
      reasoning: { effort: "low" },
      max_output_tokens: 1_200,
      input: [
        { role: "system", content: "Teach a developing Formula 1 fan from only the supplied structured evidence. Never invent IDs or facts. Return concise grounded fields." },
        { role: "user", content: JSON.stringify(context) },
      ],
      text: { format: { type: "json_schema", name: "grounded_f1_explanation", strict: true, schema: groundedExplanationJsonSchema } },
    });
    const parsed = responseSchema.safeParse(response);
    if (!parsed.success) throw new AiGenerationError("invalidOutput", "OpenAI response envelope was invalid");
    const text = parsed.data.output.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text")?.text;
    if (!text) throw new AiGenerationError("invalidOutput", "OpenAI response contained no structured output text");
    let output: unknown;
    try { output = JSON.parse(text); } catch (error) { throw new AiGenerationError("invalidOutput", "OpenAI structured output was not JSON", { cause: error }); }
    return {
      output,
      metadata: {
        generationId: parsed.data.id || randomUUID(),
        model: parsed.data.model,
        promptVersion: "grounded-explanation-v1",
        createdAt: parsed.data.created_at ? new Date(parsed.data.created_at * 1_000).toISOString() : new Date().toISOString(),
      },
    };
  }

  async embed(inputs: readonly string[]) {
    const response = await this.request("/v1/embeddings", { model: this.embeddingModel, input: inputs });
    const parsed = embeddingResponseSchema.safeParse(response);
    if (!parsed.success || parsed.data.data.length !== inputs.length) {
      throw new AiGenerationError("invalidOutput", "OpenAI embedding response was invalid");
    }
    const vectors = parsed.data.data.toSorted((a, b) => a.index - b.index).map((item) => item.embedding);
    return { vectors, model: parsed.data.model };
  }

  async classify(context: GroundingContext): Promise<unknown> {
    return this.generateJson(
      "f1_concept_classification",
      conceptClassificationJsonSchema,
      "Choose only concept IDs supplied in the context. Never invent an ID.",
      context,
    );
  }

  async discover(context: GroundingContext): Promise<unknown> {
    return this.generateJson(
      "f1_connection_discovery",
      connectionDiscoveryJsonSchema,
      "Choose only candidate moment IDs supplied in the context and give a genuine explanatory reason.",
      context,
    );
  }

  private async generateJson(name: string, schema: object, instruction: string, context: GroundingContext): Promise<unknown> {
    const response = await this.request("/v1/responses", {
      model: this.generationModel,
      reasoning: { effort: "low" },
      max_output_tokens: 800,
      input: [{ role: "system", content: instruction }, { role: "user", content: JSON.stringify(context) }],
      text: { format: { type: "json_schema", name, strict: true, schema } },
    });
    const parsed = responseSchema.safeParse(response);
    if (!parsed.success) throw new AiGenerationError("invalidOutput", "OpenAI response envelope was invalid");
    const text = parsed.data.output.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text")?.text;
    if (!text) throw new AiGenerationError("invalidOutput", "OpenAI response contained no structured output text");
    try { return JSON.parse(text); } catch (error) { throw new AiGenerationError("invalidOutput", "OpenAI structured output was not JSON", { cause: error }); }
  }

  private async request(path: string, body: unknown): Promise<unknown> {
    let response: Response;
    try {
      response = await this.fetcher(`https://api.openai.com${path}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30_000),
      });
    } catch (error) {
      throw new AiGenerationError("unavailable", "OpenAI could not be reached", { cause: error });
    }
    if (!response.ok) throw new AiGenerationError("unavailable", `OpenAI returned HTTP ${response.status}`);
    return response.json();
  }
}
