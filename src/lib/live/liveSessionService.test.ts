import { describe, expect, it } from "vitest";

import { InMemoryLiveStateCache } from "./cache";
import { britishReplayEvidence } from "./fixtures/britishReplay";
import { LiveSessionService } from "./liveSessionService";
import { detectMoments } from "./momentDetector";

describe("LiveSessionService", () => {
  it("publishes and reads the normalized session contract", async () => {
    const service = new LiveSessionService(new InMemoryLiveStateCache());
    const now = new Date("2024-07-07T15:10:00.000Z");
    const moments = detectMoments(9539, britishReplayEvidence);
    const published = await service.publish(9539, britishReplayEvidence, moments, now);
    const result = await service.read(9539, new Date("2024-07-07T15:10:10.000Z"));
    expect(result).toEqual({ kind: "available", state: published });
    expect(published.latestLap).toBe(38);
  });

  it("marks an expired checkpoint stale without corrupting it", async () => {
    const service = new LiveSessionService(new InMemoryLiveStateCache());
    await service.publish(9539, britishReplayEvidence, [], new Date());
    const result = await service.read(9539, new Date(Date.now() + 21_000));
    expect(result.kind).toBe("available");
    if (result.kind === "available") expect(result.state.status).toBe("stale");
  });

  it("returns an explicit unavailable result after cache loss", async () => {
    const service = new LiveSessionService({
      async get() { throw new Error("Redis unavailable"); },
      async set() { throw new Error("Redis unavailable"); },
    });
    await expect(service.read(9539)).resolves.toEqual({ kind: "unavailable", reason: "cache-unavailable" });
  });
});
