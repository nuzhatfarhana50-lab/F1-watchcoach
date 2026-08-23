import { describe, expect, it } from "vitest";

import { JolpicaAdapter } from "@/lib/f1/providers/jolpica/adapter";
import { OpenF1Adapter } from "@/lib/f1/providers/openf1/adapter";
import { FetchProviderRequestClient } from "@/lib/f1/providers/requestClient";

const live = process.env.LIVE_F1_PROVIDER_TESTS === "1";

describe.skipIf(!live)("live F1 provider smoke checks", () => {
  const client = new FetchProviderRequestClient();

  it("reads a stable historical Jolpica race", async () => {
    const result = await new JolpicaAdapter(client).getRaceResult(2024, 12);
    expect(result?.race.name).toBe("British Grand Prix");
    expect(result?.results.length).toBeGreaterThan(0);
  });

  it("reads structured Jolpica driver-career and championship records", async () => {
    const adapter = new JolpicaAdapter(client);
    const drivers = await adapter.listDrivers();
    const [career, standings] = await Promise.all([
      adapter.getDriverCareer("sainz"),
      adapter.getDriverStandings(2012),
    ]);
    expect(drivers.length).toBeGreaterThan(800);
    expect(drivers.some((driver) => driver.externalId === "stewart" && driver.familyName === "Stewart")).toBe(true);
    expect(career?.driver.familyName).toBe("Sainz");
    expect(career?.results.length).toBeGreaterThan(100);
    expect(career?.lastSeason).toBeGreaterThanOrEqual(2024);
    expect(career?.results.some((result) => result.team.externalId === "ferrari")).toBe(true);
    expect(standings[0]?.driver.externalId).toBe("vettel");
  });

  it("finds OpenF1 race sessions for a supported season", async () => {
    const sessions = await new OpenF1Adapter(client).findRaceSessions(2024);
    expect(sessions).toHaveLength(24);
    expect(sessions.every((session) => session.name === "Race")).toBe(true);
    expect(sessions.some((session) => session.circuitShortName.toLowerCase().includes("silverstone"))).toBe(true);
    expect(sessions.find((session) => session.circuitShortName.toLowerCase().includes("silverstone"))?.sessionKey).toBe(9558);
  });
});
