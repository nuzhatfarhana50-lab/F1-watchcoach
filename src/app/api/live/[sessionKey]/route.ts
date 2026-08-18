import { z } from "zod";

import { liveSessionService } from "@/lib/live/composition";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const parametersSchema = z.object({ sessionKey: z.coerce.number().int().positive() });

export async function GET(_request: Request, context: { params: Promise<{ sessionKey: string }> }) {
  const parsed = parametersSchema.safeParse(await context.params);
  if (!parsed.success) return Response.json({ error: "Invalid session key" }, { status: 400 });
  const result = await liveSessionService.read(parsed.data.sessionKey);
  if (result.kind === "unavailable") {
    return Response.json({ error: "Live session unavailable", reason: result.reason }, { status: 503 });
  }
  return Response.json(result.state, {
    headers: { "cache-control": "private, no-store", "x-live-state": result.state.status },
  });
}
