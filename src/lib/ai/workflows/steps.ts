import { createHash } from "node:crypto";

import type { ExplanationWorkflowInput } from "./generateExplanationWorkflow";

export async function generateAndPersistExplanation(input: ExplanationWorkflowInput) {
  "use step";
  const { groundedExplanationService } = await import("../composition");
  return groundedExplanationService.explain(input.momentId);
}

export async function generateEmbedding(input: { targetId: string; text: string }) {
  "use step";
  const { embeddingGenerator } = await import("../composition");
  if (!embeddingGenerator) return { status: "unavailable" as const, targetId: input.targetId };
  const result = await embeddingGenerator.embed([input.text]);
  return {
    status: "generated" as const,
    targetId: input.targetId,
    model: result.model,
    dimensions: result.vectors[0]?.length ?? 0,
    contentHash: createHash("sha256").update(input.text).digest("hex"),
    vector: result.vectors[0] ?? [],
  };
}
