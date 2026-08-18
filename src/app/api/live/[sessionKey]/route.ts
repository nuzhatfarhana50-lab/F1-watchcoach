import { z } from "zod";

import { liveSessionService } from "@/lib/live/composition";
import { finishRouteDiagnostic, startRouteDiagnostic } from "@/lib/observability/routeDiagnostics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const parametersSchema = z.object({ sessionKey: z.coerce.number().int().positive() });

export async function GET(request: Request, context: { params: Promise<{ sessionKey: string }> }) {
  const diagnostic = startRouteDiagnostic(request, "/api/live/[sessionKey]");
  const parsed = parametersSchema.safeParse(await context.params);
  if (!parsed.success) {
    finishRouteDiagnostic(diagnostic, 400, "invalid-request");
    return Response.json({ error: "Invalid session key" }, { status: 400 });
  }
  const result = await liveSessionService.read(parsed.data.sessionKey);
  if (result.kind === "unavailable") {
    finishRouteDiagnostic(diagnostic, 503, result.reason);
    return Response.json({ error: "Live session unavailable", reason: result.reason }, { status: 503 });
  }
  finishRouteDiagnostic(diagnostic, 200, result.state.status);
  return Response.json(result.state, {
    headers: { "cache-control": "private, no-store", "x-live-state": result.state.status },
  });
}
