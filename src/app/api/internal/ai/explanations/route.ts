import { z } from "zod";
import { start } from "workflow/api";

import { generateExplanationWorkflow } from "@/lib/ai/workflows/generateExplanationWorkflow";
import { serverEnvironment } from "@/lib/env/server";
import { hasValidBearerToken } from "@/lib/http/bearerAuthorization";
import { logger } from "@/lib/observability/logger";
import { failRouteDiagnostic, finishRouteDiagnostic, startRouteDiagnostic } from "@/lib/observability/routeDiagnostics";

export const runtime = "nodejs";

const requestSchema = z.object({ momentId: z.string().uuid() });

export async function POST(request: Request) {
  const diagnostic = startRouteDiagnostic(request, "/api/internal/ai/explanations");
  const secret = serverEnvironment.AI_WORKFLOW_SECRET;
  if (!secret) {
    finishRouteDiagnostic(diagnostic, 503, "not-configured");
    return Response.json({ error: "AI workflow is not configured" }, { status: 503 });
  }
  if (!hasValidBearerToken(request.headers.get("authorization"), secret)) {
    finishRouteDiagnostic(diagnostic, 401, "unauthorized");
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    finishRouteDiagnostic(diagnostic, 400, "invalid-request");
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const run = await start(generateExplanationWorkflow, [{ momentId: parsed.data.momentId }]);
    logger.info("Grounded explanation workflow started", { runId: run.runId, momentId: parsed.data.momentId, requestId: diagnostic.requestId });
    finishRouteDiagnostic(diagnostic, 202, "workflow-started");
    return Response.json({ runId: run.runId }, { status: 202 });
  } catch (error) {
    failRouteDiagnostic(diagnostic, error);
    return Response.json({ error: "AI workflow could not start" }, { status: 503 });
  }
}
