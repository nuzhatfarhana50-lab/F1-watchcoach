import "server-only";

import { parseServerEnvironment } from "./schema";

export const serverEnvironment = parseServerEnvironment({
  NODE_ENV: process.env.NODE_ENV,
  LOG_LEVEL: process.env.LOG_LEVEL,
});
