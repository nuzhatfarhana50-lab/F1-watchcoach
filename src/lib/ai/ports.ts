import type { GroundedExplanation, GroundingContext } from "./schemas";
import type { RaceQuestionContext } from "./raceQuestionSchemas";

export type GenerationMetadata = {
  generationId: string;
  model: string;
  promptVersion: string;
  createdAt: string;
};

export interface ExplanationGenerator {
  generate(context: GroundingContext): Promise<{ output: unknown; metadata: GenerationMetadata }>;
}

export interface EmbeddingGenerator {
  embed(inputs: readonly string[]): Promise<{ vectors: readonly (readonly number[])[]; model: string }>;
}

export interface ConceptClassifier {
  classify(context: GroundingContext): Promise<unknown>;
}

export interface ConnectionGenerator {
  discover(context: GroundingContext): Promise<unknown>;
}

export interface RaceQuestionGenerator {
  answerRaceQuestion(context: RaceQuestionContext): Promise<unknown>;
}

export interface GroundingRetriever {
  retrieve(momentId: string): Promise<GroundingContext | null>;
}

export interface ExplanationCache {
  get(key: string): Promise<GroundedExplanation | null>;
  set(key: string, value: GroundedExplanation): Promise<void>;
}

export interface GenerationRecorder {
  record(input: {
    idempotencyKey: string;
    momentId: string;
    output: GroundedExplanation;
    metadata: GenerationMetadata;
    status: "validated" | "fallback";
  }): Promise<void>;
}
