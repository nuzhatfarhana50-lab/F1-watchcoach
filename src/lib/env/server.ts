import "server-only";

import { parseServerEnvironment } from "./schema";

export const serverEnvironment = parseServerEnvironment({
  NODE_ENV: process.env.NODE_ENV,
  LOG_LEVEL: process.env.LOG_LEVEL,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  AI_WORKFLOW_SECRET: process.env.AI_WORKFLOW_SECRET,
  OPENAI_GENERATION_MODEL: process.env.OPENAI_GENERATION_MODEL,
  OPENAI_EMBEDDING_MODEL: process.env.OPENAI_EMBEDDING_MODEL,
});
