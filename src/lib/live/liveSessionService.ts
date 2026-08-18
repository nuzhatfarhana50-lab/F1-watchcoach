import type { OpenF1SessionEvidence } from "@/lib/f1/providers/contracts";

import type { LiveStateCache } from "./cache";
import { liveSessionStateSchema } from "./schemas";
import type { LiveMomentCandidate, LiveSessionReadResult, LiveSessionState } from "./types";

const ACTIVE_WINDOW_MS = 20_000;
const CACHE_TTL_SECONDS = 120;

export class LiveSessionService {
  constructor(private readonly cache: LiveStateCache) {}

  async publish(
    sessionKey: number,
    evidence: OpenF1SessionEvidence,
    moments: readonly LiveMomentCandidate[],
    now = new Date(),
  ): Promise<LiveSessionState> {
    const latestLap = evidence.laps.reduce<number | undefined>((latest, lap) => latest === undefined ? lap.lapNumber : Math.max(latest, lap.lapNumber), undefined);
    const state = liveSessionStateSchema.parse({
      sessionKey,
      status: "active",
      updatedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + ACTIVE_WINDOW_MS).toISOString(),
      checkpoint: `${sessionKey}:${evidence.laps.length}:${evidence.positions.length}:${moments.length}`,
      latestLap,
      evidence,
      moments,
    });
    await this.cache.set(state, CACHE_TTL_SECONDS);
    return state;
  }

  async read(sessionKey: number, now = new Date()): Promise<LiveSessionReadResult> {
    try {
      const state = await this.cache.get(sessionKey);
      if (!state) return { kind: "unavailable", reason: "not-ingested" };
      if (new Date(state.expiresAt).getTime() <= now.getTime()) {
        return { kind: "available", state: { ...state, status: "stale" } };
      }
      return { kind: "available", state };
    } catch {
      return { kind: "unavailable", reason: "cache-unavailable" };
    }
  }
}
