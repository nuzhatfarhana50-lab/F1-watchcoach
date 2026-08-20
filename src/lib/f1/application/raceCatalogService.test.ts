import { beforeEach, describe, expect, it } from "vitest";

import { canonicalRaceFixtures } from "@/lib/f1/fixtures/canonical-races";
import type {
  HistoricalRaceProvider,
  OpenF1Session,
  ProviderRaceResult,
  ProviderRaceSummary,
  RecentSessionProvider,
} from "@/lib/f1/providers/contracts";
import { InMemoryRaceCatalogRepository } from "@/lib/f1/repositories/inMemoryRaceCatalogRepository";

import { RaceCatalogService } from "./raceCatalogService";
import { RaceLibraryService } from "./raceLibraryService";

const fetchedAt = "2026-08-20T12:00:00.000Z";

const providerRaces: readonly ProviderRaceSummary[] = [
  {
    season: 2024,
    round: 1,
    name: "Bahrain Grand Prix",
    date: "2024-03-02",
    circuit: { externalId: "bahrain", name: "Bahrain International Circuit", locality: "Sakhir", country: "Bahrain" },
    provenance: { provider: "jolpica", externalId: "2024:1", sourceUrl: "https://api.example/2024/races", fetchedAt },
  },
  {
    season: 2024,
    round: 12,
    name: "British Grand Prix",
    date: "2024-07-07",
    circuit: { externalId: "silverstone", name: "Silverstone Circuit", locality: "Silverstone", country: "UK" },
    provenance: { provider: "jolpica", externalId: "2024:12", sourceUrl: "https://api.example/2024/races", fetchedAt },
  },
];

const britishSession: OpenF1Session = {
  meetingKey: 1240,
  sessionKey: 9558,
  year: 2024,
  name: "Race",
  type: "Race",
  country: "United Kingdom",
  circuitShortName: "Silverstone",
  startsAt: "2024-07-07T14:00:00+00:00",
  endsAt: "2024-07-07T16:00:00+00:00",
  provenance: {
    provider: "openf1",
    externalId: "9558",
    sourceUrl: "https://api.example/sessions?year=2024",
    fetchedAt,
  },
};

const emptyEvidence = async () => ({ laps: [], positions: [], pitStops: [], stints: [], raceControl: [] });

describe("RaceCatalogService", () => {
  let library: RaceLibraryService;

  beforeEach(async () => {
    const repository = new InMemoryRaceCatalogRepository();
    await repository.importFixtures(canonicalRaceFixtures);
    library = new RaceLibraryService(repository);
  });

  it("uses Jolpica as the calendar and merges OpenF1 and curated coverage", async () => {
    const service = new RaceCatalogService(
      historicalProvider(providerRaces),
      recentProvider([britishSession]),
      library,
      () => new Date("2026-08-20T00:00:00Z"),
    );

    const catalog = await service.listSeason(2024);

    expect(catalog).toMatchObject({
      mode: "provider",
      providerStates: { jolpica: "available", openf1: "available" },
      openF1RaceCount: 1,
    });
    expect(catalog.races).toHaveLength(2);
    expect(catalog.races[0]).toMatchObject({
      name: "Bahrain Grand Prix",
      coverage: { calendar: true, timing: false, learning: false },
    });
    expect(catalog.races[1]).toMatchObject({
      name: "British Grand Prix",
      momentCount: 2,
      openF1SessionKey: 9558,
      coverage: { calendar: true, timing: true, learning: true },
    });
    expect(catalog.races[1]?.sources.map((source) => source.provider)).toEqual(["jolpica", "openf1", "watchcoach"]);
  });

  it("does not ask OpenF1 for seasons before its 2023 coverage boundary", async () => {
    let recentCalls = 0;
    const service = new RaceCatalogService(
      historicalProvider([{ ...providerRaces[0]!, season: 1960 }]),
      recentProvider([], () => { recentCalls += 1; }),
      library,
    );

    const catalog = await service.listSeason(1960);

    expect(recentCalls).toBe(0);
    expect(catalog.providerStates.openf1).toBe("unsupported");
  });

  it("falls back to canonical learning fixtures when Jolpica is unavailable", async () => {
    const service = new RaceCatalogService(
      failingHistoricalProvider(),
      recentProvider([britishSession]),
      library,
    );

    const catalog = await service.listSeason(2024);

    expect(catalog.mode).toBe("fixture");
    expect(catalog.races).toHaveLength(1);
    expect(catalog.races[0]).toMatchObject({ name: "British Grand Prix", coverage: { learning: true, timing: true } });
  });

  it("returns an explicit unavailable collection when no source can cover the season", async () => {
    const service = new RaceCatalogService(failingHistoricalProvider(), recentProvider([]), library);
    await expect(service.listSeason(2022)).resolves.toMatchObject({ mode: "unavailable", races: [] });
  });

  it("returns normalized classification data for a provider-backed race detail", async () => {
    const result: ProviderRaceResult = {
      race: providerRaces[0]!,
      results: [{
        position: 1,
        gridPosition: 1,
        lapsCompleted: 57,
        points: 25,
        status: "Finished",
        driver: { externalId: "verstappen", givenName: "Max", familyName: "Verstappen" },
        team: { externalId: "red_bull", name: "Red Bull" },
        provenance: providerRaces[0]!.provenance,
      }],
    };
    const service = new RaceCatalogService(
      historicalProvider(providerRaces, result),
      recentProvider([]),
      library,
    );

    const detail = await service.getRaceDetail(2024, 1);

    expect(detail).toMatchObject({
      kind: "found",
      detail: {
        classificationState: "available",
        classification: [{ position: 1, driverName: "Max Verstappen", teamName: "Red Bull" }],
      },
    });
  });
});

function historicalProvider(
  races: readonly ProviderRaceSummary[],
  result: ProviderRaceResult | null = null,
): HistoricalRaceProvider {
  return {
    async listRaces() { return races; },
    async getRaceResult() { return result; },
  };
}

function failingHistoricalProvider(): HistoricalRaceProvider {
  return {
    async listRaces() { throw new Error("offline"); },
    async getRaceResult() { throw new Error("offline"); },
  };
}

function recentProvider(sessions: readonly OpenF1Session[], onCall?: () => void): RecentSessionProvider {
  return {
    async findRaceSessions() { onCall?.(); return sessions; },
    getSessionEvidence: emptyEvidence,
    async getCarData() { return []; },
  };
}
