import { randomUUID } from "node:crypto";

import { logger } from "./logger";

export type RouteDiagnostic = {
  route: string;
  requestId: string;
  startedAt: number;
};

export function startRouteDiagnostic(request: Request, route: string): RouteDiagnostic {
  const diagnostic = {
    route,
    requestId: request.headers.get("x-vercel-id") ?? randomUUID(),
    startedAt: performance.now(),
  };
  logger.info("Route started", { route, requestId: diagnostic.requestId });
  return diagnostic;
}

export function finishRouteDiagnostic(diagnostic: RouteDiagnostic, status: number, outcome: string): void {
  logger.info("Route completed", {
    route: diagnostic.route,
    requestId: diagnostic.requestId,
    status,
    outcome,
    durationMs: Math.round(performance.now() - diagnostic.startedAt),
  });
}

export function failRouteDiagnostic(diagnostic: RouteDiagnostic, error: unknown): void {
  logger.error("Route failed", {
    route: diagnostic.route,
    requestId: diagnostic.requestId,
    errorName: error instanceof Error ? error.name : "UnknownError",
    durationMs: Math.round(performance.now() - diagnostic.startedAt),
  });
}
