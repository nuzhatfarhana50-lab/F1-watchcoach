import { describe, expect, it } from "vitest";

import type { ProviderRequestClient } from "../requestClient";
import { OpenF1Adapter } from "./adapter";
import { evidencePayloads, sessionPayload } from "./fixtures/british-2024";

const client: ProviderRequestClient = {
  async get(request) {
    const endpoint = new URL(request.url).pathname.split("/").at(-1) as keyof typeof evidencePayloads | "sessions";
    const data = endpoint === "sessions" ? sessionPayload : evidencePayloads[endpoint];
    return { data, fetchedAt: "2026-08-18T12:00:00.000Z", sourceUrl: request.url };
  },
};

describe("OpenF1Adapter", () => {
  it("normalizes supported race sessions", async () => {
    const [session] = await new OpenF1Adapter(client).findRaceSessions(2024);
    expect(session).toMatchObject({ sessionKey: 9539, year: 2024, circuitShortName: "Silverstone" });
  });

  it("normalizes timing evidence without deprecated pit_duration", async () => {
    const evidence = await new OpenF1Adapter(client).getSessionEvidence(9539);
    expect(evidence.laps[0]?.durationMs).toBe(91_234);
    expect(evidence.pitStops[0]).toMatchObject({ laneDurationMs: 28_400, stopDurationMs: undefined });
    expect(evidence.stints[0]).toMatchObject({ compound: "soft", endLap: 52 });
    expect(evidence.raceControl[0]?.provenance.provider).toBe("openf1");
  });

  it("normalizes optional telemetry", async () => {
    const [sample] = await new OpenF1Adapter(client).getCarData(9539, 44);
    expect(sample).toMatchObject({ driverNumber: 44, speed: 296, gear: 8 });
  });
});
