import type { EmbeddingGenerator } from "./ports";

export type RelatedMomentCandidate = { id: string; title: string; reason: string; score: number };

export interface RelatedMomentIndex {
  findStructured(input: { momentId: string; conceptIds: readonly string[]; limit: number }): Promise<readonly RelatedMomentCandidate[]>;
  allowedSemanticCandidateIds(input: { momentId: string; conceptIds: readonly string[] }): Promise<readonly string[]>;
  findSemantic(input: { vector: readonly number[]; allowedIds: readonly string[]; limit: number }): Promise<readonly RelatedMomentCandidate[]>;
}

export class StructuredFirstRelatedMomentRetriever {
  constructor(private readonly index: RelatedMomentIndex, private readonly embeddings: EmbeddingGenerator) {}

  async retrieve(input: { momentId: string; conceptIds: readonly string[]; queryText: string; limit?: number }) {
    const limit = input.limit ?? 5;
    const structured = await this.index.findStructured({ momentId: input.momentId, conceptIds: input.conceptIds, limit });
    if (structured.length >= limit) return structured.slice(0, limit);

    const allowedIds = await this.index.allowedSemanticCandidateIds({ momentId: input.momentId, conceptIds: input.conceptIds });
    if (allowedIds.length === 0) return structured;
    const embedded = await this.embeddings.embed([input.queryText]);
    const vector = embedded.vectors[0];
    if (!vector) return structured;
    const semantic = await this.index.findSemantic({ vector, allowedIds, limit: limit - structured.length });
    const seen = new Set(structured.map((candidate) => candidate.id));
    return [...structured, ...semantic.filter((candidate) => allowedIds.includes(candidate.id) && !seen.has(candidate.id))].slice(0, limit);
  }
}
