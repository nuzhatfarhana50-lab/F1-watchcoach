import "server-only";

import { serverEnvironment } from "@/lib/env/server";
import { createLogger } from "./loggerCore";

export type { LogContext, Logger, LogLevel } from "./loggerCore";
export { createLogger } from "./loggerCore";

export const logger = createLogger({ service: "f1-watchcoach" }, serverEnvironment.LOG_LEVEL);
