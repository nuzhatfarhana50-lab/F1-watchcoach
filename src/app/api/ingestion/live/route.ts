import { start } from "workflow/api";

import { serverEnvironment } from "@/lib/env/server";
import { hasValidBearerToken } from "@/lib/http/bearerAuthorization";
import { ingestionRequestSchema } from "@/lib/live/schemas";
import { liveIngestionWorkflow } from "@/lib/live/workflows/liveIngestionWorkflow";
import { logger } from "@/lib/observability/logger";
import { failRouteDiagnostic, finishRouteDiagnostic, startRouteDiagnostic } from "@/lib/observability/routeDiagnostics";
import { FixedWindowRateLimiter } from "@/lib/security/rateLimiter";

export const runtime = "nodejs";
const ingestionRateLimiter = new FixedWindowRateLimiter(6, 60_000);

export async function POST(request: Request) {
  const diagnostic = startRouteDiagnostic(request, "/api/ingestion/live");
  const secret = serverEnvironment.INGESTION_SECRET;
  if (!secret) {
    finishRouteDiagnostic(diagnostic, 503, "not-configured");
    return Response.json({ error: "Live ingestion is not configured" }, { status: 503 });
  }
  if (!hasValidBearerToken(request.headers.get("authorization"), secret)) {
    finishRouteDiagnostic(diagnostic, 401, "unauthorized");
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = ingestionRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    finishRouteDiagnostic(diagnostic, 400, "invalid-request");
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!ingestionRateLimiter.allow(String(parsed.data.sessionKey))) {
    finishRouteDiagnostic(diagnostic, 429, "rate-limited");
    return Response.json({ error: "Too many ingestion requests" }, { status: 429 });
  }

  try {
    const run = await start(liveIngestionWorkflow, [{ sessionKey: parsed.data.sessionKey }]);
    logger.info("Live ingestion workflow started", { runId: run.runId, sessionKey: parsed.data.sessionKey, requestId: diagnostic.requestId });
    finishRouteDiagnostic(diagnostic, 202, "workflow-started");
    return Response.json({ runId: run.runId }, { status: 202 });
  } catch (error) {
    failRouteDiagnostic(diagnostic, error);
    return Response.json({ error: "Live ingestion could not start" }, { status: 503 });
  }
}
