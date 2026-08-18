import { start } from "workflow/api";

import { serverEnvironment } from "@/lib/env/server";
import { hasValidBearerToken } from "@/lib/http/bearerAuthorization";
import { liveIngestionWorkflow } from "@/lib/live/workflows/liveIngestionWorkflow";
import { logger } from "@/lib/observability/logger";
import { failRouteDiagnostic, finishRouteDiagnostic, startRouteDiagnostic } from "@/lib/observability/routeDiagnostics";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const diagnostic = startRouteDiagnostic(request, "/api/cron/live");
  const secret = serverEnvironment.CRON_SECRET;
  const sessionKey = serverEnvironment.LIVE_SESSION_KEY;
  if (!secret || !sessionKey) {
    finishRouteDiagnostic(diagnostic, 503, "not-configured");
    return Response.json({ error: "Live cron is not configured" }, { status: 503 });
  }
  if (!hasValidBearerToken(request.headers.get("authorization"), secret)) {
    finishRouteDiagnostic(diagnostic, 401, "unauthorized");
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const run = await start(liveIngestionWorkflow, [{ sessionKey }]);
    logger.info("Scheduled live ingestion workflow started", { runId: run.runId, sessionKey, requestId: diagnostic.requestId });
    finishRouteDiagnostic(diagnostic, 202, "workflow-started");
    return Response.json({ runId: run.runId }, { status: 202 });
  } catch (error) {
    failRouteDiagnostic(diagnostic, error);
    return Response.json({ error: "Scheduled ingestion could not start" }, { status: 503 });
  }
}
