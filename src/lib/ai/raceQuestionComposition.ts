import "server-only";

import { serverEnvironment } from "@/lib/env/server";
import { f1Providers } from "@/lib/f1/providers/composition";

import { OpenAiAdapter } from "./openaiAdapter";
import { RaceQuestionService } from "./raceQuestionService";

const generator = serverEnvironment.OPENAI_API_KEY
  ? new OpenAiAdapter(
      serverEnvironment.OPENAI_API_KEY,
      serverEnvironment.OPENAI_GENERATION_MODEL,
      serverEnvironment.OPENAI_EMBEDDING_MODEL,
    )
  : undefined;

export const raceQuestionService = new RaceQuestionService(
  f1Providers.historical,
  generator,
  undefined,
  generator,
  generator,
);
