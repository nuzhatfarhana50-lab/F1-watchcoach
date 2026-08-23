import { describe, expect, it } from "vitest";

import payload from "./fixtures/british-2024.json";
import { JolpicaAdapter } from "./adapter";
import type { ProviderRequestClient } from "../requestClient";

const client: ProviderRequestClient = {
  async get(request) {
    const standings = {
      MRData: {
        StandingsTable: {
          StandingsLists: [{
            season: "2024",
            DriverStandings: [{
              position: "1",
              points: "437",
              wins: "9",
              Driver: { driverId: "verstappen", givenName: "Max", familyName: "Verstappen", nationality: "Dutch" },
              Constructors: [{ constructorId: "red_bull", name: "Red Bull Racing", nationality: "Austrian" }],
            }],
          }],
        },
      },
    };
    return { data: request.url.includes("driverstandings") ? standings : payload, fetchedAt: "2026-08-18T12:00:00.000Z", sourceUrl: request.url };
  },
};

describe("JolpicaAdapter", () => {
  it("normalizes a race calendar response with provenance", async () => {
    const [race] = await new JolpicaAdapter(client).listRaces(2024);
    expect(race).toMatchObject({
      season: 2024,
      round: 12,
      name: "British Grand Prix",
      circuit: { externalId: "silverstone" },
      provenance: { provider: "jolpica", externalId: "2024:12" },
    });
  });

  it("normalizes identities and historical results", async () => {
    const result = await new JolpicaAdapter(client).getRaceResult(2024, 12);
    expect(result?.results[0]).toMatchObject({
      position: 1,
      gridPosition: 2,
      driver: { externalId: "hamilton", permanentNumber: 44 },
      team: { externalId: "mercedes" },
    });
  });

  it("normalizes a driver career and calculates deterministic totals", async () => {
    const career = await new JolpicaAdapter(client).getDriverCareer("hamilton");
    expect(career).toMatchObject({
      driver: { externalId: "hamilton", nationality: "British" },
      firstSeason: 2024,
      lastSeason: 2024,
      starts: 1,
      wins: 1,
      podiums: 1,
      provenance: { provider: "jolpica", externalId: "driver:hamilton:results" },
    });
  });

  it("normalizes driver standings for deterministic championship answers", async () => {
    const [leader] = await new JolpicaAdapter(client).getDriverStandings(2024);
    expect(leader).toMatchObject({
      season: 2024,
      position: 1,
      points: 437,
      wins: 9,
      driver: { externalId: "verstappen" },
      teams: [{ externalId: "red_bull" }],
    });
  });
});
