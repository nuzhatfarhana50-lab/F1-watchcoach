import "server-only";

import { serverEnvironment } from "@/lib/env/server";

export type LogLevel = "debug" | "info" | "warn" | "error";

type LogValue = string | number | boolean | null | undefined;

export type LogContext = Readonly<Record<string, LogValue>>;

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
  child(context: LogContext): Logger;
}

const priorities: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const sensitiveKeyPattern = /authorization|cookie|credential|password|secret|token/i;

function redact(context: LogContext): LogContext {
  return Object.fromEntries(
    Object.entries(context).map(([key, value]) => [
      key,
      sensitiveKeyPattern.test(key) ? "[REDACTED]" : value,
    ]),
  );
}

export function createLogger(
  baseContext: LogContext = {},
  minimumLevel: LogLevel = serverEnvironment.LOG_LEVEL,
): Logger {
  function write(level: LogLevel, message: string, context: LogContext = {}) {
    if (priorities[level] < priorities[minimumLevel]) {
      return;
    }

    const entry = JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      message,
      ...redact({ ...baseContext, ...context }),
    });

    if (level === "error") {
      console.error(entry);
      return;
    }

    if (level === "warn") {
      console.warn(entry);
      return;
    }

    console.info(entry);
  }

  return {
    debug: (message, context) => write("debug", message, context),
    info: (message, context) => write("info", message, context),
    warn: (message, context) => write("warn", message, context),
    error: (message, context) => write("error", message, context),
    child: (context) =>
      createLogger({ ...baseContext, ...context }, minimumLevel),
  };
}

export const logger = createLogger({ service: "f1-watchcoach" });
