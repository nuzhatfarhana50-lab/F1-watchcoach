import { start } from "workflow/api";

import { serverEnvironment } from "@/lib/env/server";
import { hasValidBearerToken } from "@/lib/http/bearerAuthorization";
import { ingestionRequestSchema } from "@/lib/live/schemas";
import { liveIngestionWorkflow } from "@/lib/live/workflows/liveIngestionWorkflow";
import { logger } from "@/lib/observability/logger";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = serverEnvironment.INGESTION_SECRET;
  if (!secret) return Response.json({ error: "Live ingestion is not configured" }, { status: 503 });
  if (!hasValidBearerToken(request.headers.get("authorization"), secret)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = ingestionRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });

  const run = await start(liveIngestionWorkflow, [{ sessionKey: parsed.data.sessionKey }]);
  logger.info("Live ingestion workflow started", { runId: run.runId, sessionKey: parsed.data.sessionKey });
  return Response.json({ runId: run.runId }, { status: 202 });
}
