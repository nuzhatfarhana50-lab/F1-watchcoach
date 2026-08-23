import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";

import { AiGenerationError } from "./errors";
import type { ConceptClassifier, ConnectionGenerator, EmbeddingGenerator, ExplanationGenerator, F1ScopeClassifier, F1WebRetriever, RaceQuestionGenerator } from "./ports";
import { f1ScopeSchema, generatedRaceQuestionAnswerJsonSchema, type F1ConversationTurn, type F1QueryPlan, type RaceQuestionContext, type RaceQuestionSource } from "./raceQuestionSchemas";
import { conceptClassificationJsonSchema, connectionDiscoveryJsonSchema, groundedExplanationJsonSchema, type GroundingContext } from "./schemas";
import { isAllowedF1WebUrl, trustedF1PrimaryDomains, trustedF1WebDomains } from "./trustedF1Domains";

const responseSchema = z.object({
  id: z.string().min(1),
  model: z.string().min(1),
  created_at: z.number().optional(),
  output: z.array(z.object({
    type: z.string(),
    content: z.array(z.object({
      type: z.string(),
      text: z.string().optional(),
      annotations: z.array(z.object({
        type: z.string(),
        url: z.string().url().optional(),
        title: z.string().optional(),
      }).passthrough()).optional(),
    }).passthrough()).optional(),
    action: z.object({
      sources: z.array(z.object({ type: z.string(), url: z.string().url() }).passthrough()).optional(),
    }).passthrough().optional(),
  }).passthrough()),
}).passthrough();

const embeddingResponseSchema = z.object({
  model: z.string().min(1),
  data: z.array(z.object({ index: z.number().int(), embedding: z.array(z.number()) })),
});

export class OpenAiAdapter implements ExplanationGenerator, EmbeddingGenerator, ConceptClassifier, ConnectionGenerator, RaceQuestionGenerator, F1ScopeClassifier, F1WebRetriever {
  private readonly webCache = new Map<string, { expiresAt: number; value: { answer: string; sources: readonly RaceQuestionSource[] } }>();

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

  async answerRaceQuestion(context: RaceQuestionContext): Promise<unknown> {
    return this.generateJson(
      "grounded_f1_race_answer",
      generatedRaceQuestionAnswerJsonSchema,
      "Answer only the Formula 1 race question supplied. Use only the structured race evidence and sources in the context. Never use model memory, infer an unsupported cause, or answer a different topic. If the evidence does not establish the requested fact, say so plainly. Cite only source IDs present in the context and keep the answer concise and beginner-friendly.",
      context,
    );
  }

  async classifyF1Scope(question: string, conversation: readonly F1ConversationTurn[]) {
    const output = await this.generateJson(
      "f1_scope",
      {
        type: "object",
        additionalProperties: false,
        properties: { scope: { type: "string", enum: f1ScopeSchema.options } },
        required: ["scope"],
      },
      "Classify only whether the question is fundamentally about Formula 1, context directly required to explain Formula 1, or unrelated. A known F1 person's unrelated private preferences remain out of scope. Return only the schema.",
      { question, conversation },
    );
    return z.object({ scope: f1ScopeSchema }).parse(output).scope;
  }

  async retrieveF1Web(input: { question: string; plan: F1QueryPlan; structuredFacts: readonly string[] }) {
    const cacheKey = createHash("sha256").update(JSON.stringify(input)).digest("hex");
    const cached = this.webCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    let value: { answer: string; sources: readonly RaceQuestionSource[] };
    try {
      value = await this.searchF1Web(input, trustedF1PrimaryDomains);
    } catch (error) {
      if (!(error instanceof AiGenerationError) || error.kind !== "insufficientEvidence") throw error;
      value = await this.searchF1Web(input, trustedF1WebDomains);
    }
    const ttlMs = input.plan.currentness === "CURRENT" || input.plan.currentness === "CURRENT_AND_HISTORICAL"
      ? 5 * 60 * 1_000
      : 24 * 60 * 60 * 1_000;
    if (this.webCache.size >= 100) this.webCache.delete(this.webCache.keys().next().value ?? "");
    this.webCache.set(cacheKey, { expiresAt: Date.now() + ttlMs, value });
    return value;
  }

  private async searchF1Web(
    input: { question: string; plan: F1QueryPlan; structuredFacts: readonly string[] },
    allowedDomains: readonly string[],
  ): Promise<{ answer: string; sources: readonly RaceQuestionSource[] }> {
    const response = await this.request("/v1/responses", {
      model: this.generationModel,
      reasoning: { effort: "low" },
      max_output_tokens: 1_200,
      store: false,
      include: ["web_search_call.action.sources"],
      tools: [{
        type: "web_search",
        filters: { allowed_domains: allowedDomains },
        search_context_size: input.plan.currentness === "CURRENT" || input.plan.currentness === "CURRENT_AND_HISTORICAL" ? "high" : "medium",
      }],
      tool_choice: "required",
      input: [
        {
          role: "system",
          content: "You are F1 Watchcoach, a Formula 1-only teaching companion. Search only the configured trusted domains. Begin with the direct answer, then add only context needed to understand why it matters. Use supplied structured facts where relevant. Never invent a result, quote, motive, regulation, statistic, event, or source. Distinguish confirmed facts from interpretation. If the configured sources cannot establish the requested answer, begin the response exactly with INSUFFICIENT_TRUSTED_EVIDENCE. Do not answer non-F1 material.",
        },
        { role: "user", content: JSON.stringify(input) },
      ],
    });
    const parsed = responseSchema.safeParse(response);
    if (!parsed.success) throw new AiGenerationError("invalidOutput", "OpenAI web response envelope was invalid");
    const outputText = parsed.data.output.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text");
    if (!outputText?.text) throw new AiGenerationError("invalidOutput", "OpenAI web response contained no answer text");
    if (outputText.text.trim().startsWith("INSUFFICIENT_TRUSTED_EVIDENCE")) {
      throw new AiGenerationError("insufficientEvidence", "Configured F1 web sources were insufficient");
    }

    const annotatedSources = (outputText.annotations ?? []).flatMap((annotation) => annotation.url ? [{ url: annotation.url, title: annotation.title }] : []);
    const toolSources = parsed.data.output.flatMap((item) => item.action?.sources ?? []).map((source) => ({ url: source.url, title: undefined }));
    const byUrl = new Map<string, RaceQuestionSource>();
    for (const source of [...annotatedSources, ...toolSources]) {
      if (!isAllowedF1WebUrl(source.url, allowedDomains) || byUrl.has(source.url)) continue;
      const host = new URL(source.url).hostname.replace(/^www\./, "");
      byUrl.set(source.url, {
        id: `web:${createHash("sha256").update(source.url).digest("hex").slice(0, 16)}`,
        provider: host,
        title: source.title?.trim() || host,
        url: source.url,
      });
    }
    const sources = [...byUrl.values()].slice(0, 8);
    if (sources.length === 0) throw new AiGenerationError("insufficientEvidence", "OpenAI web answer contained no allowed citations");
    return { answer: outputText.text.trim(), sources };
  }

  private async generateJson(name: string, schema: object, instruction: string, context: unknown): Promise<unknown> {
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
