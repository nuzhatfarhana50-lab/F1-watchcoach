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
    let requestedUrl = "";
    const capturingClient: ProviderRequestClient = {
      async get(request) {
        requestedUrl = request.url;
        return { data: sessionPayload, fetchedAt: "2026-08-18T12:00:00.000Z", sourceUrl: request.url };
      },
    };
    const [session] = await new OpenF1Adapter(capturingClient).findRaceSessions(2024);
    expect(session).toMatchObject({ sessionKey: 9558, year: 2024, circuitShortName: "Silverstone" });
    expect(new URL(requestedUrl).searchParams.get("session_name")).toBe("Race");
    expect(new URL(requestedUrl).searchParams.has("session_type")).toBe(false);
  });

  it("defensively removes sprint-named and cancelled sessions", async () => {
    const filteringClient: ProviderRequestClient = {
      async get(request) {
        return {
          data: [
            ...sessionPayload,
            { ...sessionPayload[0], session_key: 9540, session_name: "Sprint" },
            { ...sessionPayload[0], session_key: 9541, is_cancelled: true },
          ],
          fetchedAt: "2026-08-18T12:00:00.000Z",
          sourceUrl: request.url,
        };
      },
    };

    const sessions = await new OpenF1Adapter(filteringClient).findRaceSessions(2024);
    expect(sessions.map((session) => session.sessionKey)).toEqual([9558]);
  });

  it("normalizes timing evidence without deprecated pit_duration", async () => {
    const evidence = await new OpenF1Adapter(client).getSessionEvidence(9558);
    expect(evidence.laps[0]?.durationMs).toBe(91_234);
    expect(evidence.pitStops[0]).toMatchObject({ laneDurationMs: 28_400, stopDurationMs: undefined });
    expect(evidence.stints[0]).toMatchObject({ compound: "soft", endLap: 52 });
    expect(evidence.raceControl[0]?.provenance.provider).toBe("openf1");
  });

  it("normalizes optional telemetry", async () => {
    const [sample] = await new OpenF1Adapter(client).getCarData(9558, 44);
    expect(sample).toMatchObject({ driverNumber: 44, speed: 296, gear: 8 });
  });
});
