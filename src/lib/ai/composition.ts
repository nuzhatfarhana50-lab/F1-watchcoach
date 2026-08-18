import "server-only";

import { serverEnvironment } from "@/lib/env/server";

import { AiGenerationError } from "./errors";
import { FixtureGroundingRetriever } from "./fixtureGroundingRetriever";
import { GroundedExplanationService, InMemoryExplanationCache } from "./groundedExplanationService";
import { OpenAiAdapter } from "./openaiAdapter";
import type { ExplanationGenerator } from "./ports";
import { PrismaGenerationRecorder } from "./prismaGenerationRecorder";

const unavailableGenerator: ExplanationGenerator = {
  async generate() {
    throw new AiGenerationError("unavailable", "OPENAI_API_KEY is not configured");
  },
};

const generator = serverEnvironment.OPENAI_API_KEY
  ? new OpenAiAdapter(
      serverEnvironment.OPENAI_API_KEY,
      serverEnvironment.OPENAI_GENERATION_MODEL,
      serverEnvironment.OPENAI_EMBEDDING_MODEL,
    )
  : unavailableGenerator;

export const groundedExplanationService = new GroundedExplanationService(
  new FixtureGroundingRetriever(),
  generator,
  new InMemoryExplanationCache(),
  new PrismaGenerationRecorder(),
);

export const embeddingGenerator = serverEnvironment.OPENAI_API_KEY
  ? new OpenAiAdapter(
      serverEnvironment.OPENAI_API_KEY,
      serverEnvironment.OPENAI_GENERATION_MODEL,
      serverEnvironment.OPENAI_EMBEDDING_MODEL,
    )
  : null;
