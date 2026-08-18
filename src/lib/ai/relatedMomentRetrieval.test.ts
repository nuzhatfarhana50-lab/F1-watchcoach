import { describe, expect, it, vi } from "vitest";

import type { EmbeddingGenerator } from "./ports";
import { StructuredFirstRelatedMomentRetriever, type RelatedMomentIndex } from "./relatedMomentRetrieval";

const embeddings: EmbeddingGenerator = { embed: vi.fn(async () => ({ vectors: [[1, 0]], model: "fixture" })) };

describe("StructuredFirstRelatedMomentRetriever", () => {
  it("uses exact structured results before semantic retrieval", async () => {
    const index: RelatedMomentIndex = {
      findStructured: vi.fn(async () => [{ id: "real", title: "Real", reason: "sameConcept", score: 1 }]),
      allowedSemanticCandidateIds: vi.fn(async () => []),
      findSemantic: vi.fn(async () => []),
    };
    const result = await new StructuredFirstRelatedMomentRetriever(index, embeddings).retrieve({ momentId: "source", conceptIds: ["concept"], queryText: "pit window", limit: 1 });
    expect(result.map((item) => item.id)).toEqual(["real"]);
    expect(index.allowedSemanticCandidateIds).not.toHaveBeenCalled();
  });

  it("accepts semantic candidates only after structured filtering", async () => {
    const index: RelatedMomentIndex = {
      findStructured: vi.fn(async () => []),
      allowedSemanticCandidateIds: vi.fn(async () => ["allowed"]),
      findSemantic: vi.fn(async () => [
        { id: "invented", title: "Invented", reason: "similar", score: 0.99 },
        { id: "allowed", title: "Allowed", reason: "similar", score: 0.8 },
      ]),
    };
    const result = await new StructuredFirstRelatedMomentRetriever(index, embeddings).retrieve({ momentId: "source", conceptIds: ["concept"], queryText: "pit window" });
    expect(result.map((item) => item.id)).toEqual(["allowed"]);
  });
});
