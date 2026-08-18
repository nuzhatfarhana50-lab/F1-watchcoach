import { timingSafeEqual } from "node:crypto";

import { z } from "zod";
import { start } from "workflow/api";

import { generateExplanationWorkflow } from "@/lib/ai/workflows/generateExplanationWorkflow";
import { serverEnvironment } from "@/lib/env/server";
import { logger } from "@/lib/observability/logger";

export const runtime = "nodejs";

const requestSchema = z.object({ momentId: z.string().uuid() });

export async function POST(request: Request) {
  const secret = serverEnvironment.AI_WORKFLOW_SECRET;
  if (!secret) return Response.json({ error: "AI workflow is not configured" }, { status: 503 });
  if (!isAuthorized(request.headers.get("authorization"), secret)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });

  const run = await start(generateExplanationWorkflow, [{ momentId: parsed.data.momentId }]);
  logger.info("Grounded explanation workflow started", { runId: run.runId, momentId: parsed.data.momentId });
  return Response.json({ runId: run.runId }, { status: 202 });
}

function isAuthorized(header: string | null, secret: string): boolean {
  if (!header?.startsWith("Bearer ")) return false;
  const provided = Buffer.from(header.slice(7));
  const expected = Buffer.from(secret);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}
