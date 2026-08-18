import { generateAndPersistExplanation, generateEmbedding } from "./steps";

export type ExplanationWorkflowInput = { momentId: string };

export async function generateExplanationWorkflow(input: ExplanationWorkflowInput) {
  "use workflow";
  return generateAndPersistExplanation(input);
}

export async function generateEmbeddingWorkflow(input: { targetId: string; text: string }) {
  "use workflow";
  return generateEmbedding(input);
}
