import { start } from "workflow/api";

import { serverEnvironment } from "@/lib/env/server";
import { hasValidBearerToken } from "@/lib/http/bearerAuthorization";
import { liveIngestionWorkflow } from "@/lib/live/workflows/liveIngestionWorkflow";
import { logger } from "@/lib/observability/logger";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const secret = serverEnvironment.CRON_SECRET;
  const sessionKey = serverEnvironment.LIVE_SESSION_KEY;
  if (!secret || !sessionKey) return Response.json({ error: "Live cron is not configured" }, { status: 503 });
  if (!hasValidBearerToken(request.headers.get("authorization"), secret)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const run = await start(liveIngestionWorkflow, [{ sessionKey }]);
  logger.info("Scheduled live ingestion workflow started", { runId: run.runId, sessionKey });
  return Response.json({ runId: run.runId }, { status: 202 });
}
