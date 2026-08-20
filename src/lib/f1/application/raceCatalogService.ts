import type {
  HistoricalRaceProvider,
  OpenF1Session,
  ProviderProvenance,
  ProviderRaceSummary,
  RecentSessionProvider,
} from "@/lib/f1/providers/contracts";

import type { RaceLibraryItem } from "./raceLibraryService";
import { RaceLibraryService } from "./raceLibraryService";

export type RaceCatalogProviderState = "available" | "unavailable" | "unsupported";

export type RaceCatalogSource = {
  provider: "jolpica" | "openf1" | "watchcoach";
  label: string;
  url?: string;
  fetchedAt?: string;
};

export type RaceCatalogItem = RaceLibraryItem & {
  openF1SessionKey?: number;
  coverage: {
    calendar: true;
    timing: boolean;
    learning: boolean;
  };
  sources: readonly RaceCatalogSource[];
};

export type SeasonRaceCatalog = {
  season: number;
  mode: "provider" | "fixture" | "unavailable";
  races: readonly RaceCatalogItem[];
  providerStates: {
    jolpica: RaceCatalogProviderState;
    openf1: RaceCatalogProviderState;
  };
  openF1RaceCount: number;
};

export type RaceClassificationRow = {
  position?: number;
  driverName: string;
  teamName: string;
  gridPosition: number;
  lapsCompleted: number;
  points: number;
  status: string;
};

export type ProviderRaceDetail = {
  race: RaceCatalogItem;
  classification: readonly RaceClassificationRow[];
  classificationState: "available" | "notPublished" | "unavailable";
  resultSource?: RaceCatalogSource;
};

export type ProviderRaceDetailResult =
  | { kind: "found"; detail: ProviderRaceDetail }
  | { kind: "notFound" }
  | { kind: "unavailable" };

export class RaceCatalogService {
  constructor(
    private readonly historicalProvider: HistoricalRaceProvider,
    private readonly recentProvider: RecentSessionProvider,
    private readonly curatedLibrary: RaceLibraryService,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async listSeason(season: number): Promise<SeasonRaceCatalog> {
    const curated = (await this.curatedLibrary.listRaces()).filter((race) => race.season === season);
    const recentRequest = season >= 2023
      ? this.recentProvider.findRaceSessions(season)
      : Promise.resolve<readonly OpenF1Session[]>([]);

    const [historicalAttempt, recentAttempt] = await Promise.allSettled([
      this.historicalProvider.listRaces(season),
      recentRequest,
    ]);

    const providerStates: SeasonRaceCatalog["providerStates"] = {
      jolpica: historicalAttempt.status === "fulfilled" ? "available" : "unavailable",
      openf1: season < 2023
        ? "unsupported"
        : recentAttempt.status === "fulfilled" ? "available" : "unavailable",
    };
    const sessions = recentAttempt.status === "fulfilled" ? recentAttempt.value : [];

    if (historicalAttempt.status === "fulfilled") {
      const races = historicalAttempt.value.map((race) => this.mergeRace(race, curated, sessions));
      return {
        season,
        mode: "provider",
        races,
        providerStates,
        openF1RaceCount: races.filter((race) => race.coverage.timing).length,
      };
    }

    if (curated.length > 0) {
      const races = curated.map((race) => this.fromCuratedRace(race, sessions));
      return {
        season,
        mode: "fixture",
        races,
        providerStates,
        openF1RaceCount: races.filter((race) => race.coverage.timing).length,
      };
    }

    return { season, mode: "unavailable", races: [], providerStates, openF1RaceCount: 0 };
  }

  async getRaceDetail(season: number, round: number): Promise<ProviderRaceDetailResult> {
    const [catalog, resultAttempt] = await Promise.all([
      this.listSeason(season),
      this.historicalProvider.getRaceResult(season, round).then(
        (result) => ({ status: "fulfilled" as const, result }),
        () => ({ status: "rejected" as const }),
      ),
    ]);

    if (catalog.mode === "unavailable") return { kind: "unavailable" };
    const race = catalog.races.find((candidate) => candidate.round === round);
    if (!race) return { kind: "notFound" };

    if (resultAttempt.status === "rejected") {
      return {
        kind: "found",
        detail: { race, classification: [], classificationState: "unavailable" },
      };
    }

    if (!resultAttempt.result || resultAttempt.result.results.length === 0) {
      return {
        kind: "found",
        detail: { race, classification: [], classificationState: "notPublished" },
      };
    }

    const result = resultAttempt.result;
    return {
      kind: "found",
      detail: {
        race,
        classificationState: "available",
        classification: result.results.map((entry) => ({
          position: entry.position,
          driverName: `${entry.driver.givenName} ${entry.driver.familyName}`,
          teamName: entry.team.name,
          gridPosition: entry.gridPosition,
          lapsCompleted: entry.lapsCompleted,
          points: entry.points,
          status: entry.status,
        })),
        resultSource: this.toSource(result.race.provenance, "Jolpica classification"),
      },
    };
  }

  private mergeRace(
    providerRace: ProviderRaceSummary,
    curated: readonly RaceLibraryItem[],
    sessions: readonly OpenF1Session[],
  ): RaceCatalogItem {
    const curatedRace = curated.find((race) => race.round === providerRace.round);
    const session = this.findMatchingSession(providerRace.date, sessions);
    return {
      id: curatedRace?.id ?? `jolpica:${providerRace.season}:${providerRace.round}`,
      season: providerRace.season,
      round: providerRace.round,
      name: curatedRace?.name ?? providerRace.name,
      officialName: curatedRace?.officialName ?? providerRace.name,
      date: providerRace.date,
      circuit: {
        name: curatedRace?.circuit.name ?? providerRace.circuit.name,
        locality: curatedRace?.circuit.locality ?? providerRace.circuit.locality,
        country: curatedRace?.circuit.country ?? providerRace.circuit.country,
      },
      status: curatedRace?.status ?? this.statusFromDate(providerRace.date),
      laps: curatedRace?.laps,
      momentCount: curatedRace?.momentCount ?? 0,
      href: `/races/${providerRace.season}/${providerRace.round}`,
      openF1SessionKey: session?.sessionKey,
      coverage: { calendar: true, timing: Boolean(session), learning: Boolean(curatedRace) },
      sources: [
        this.toSource(providerRace.provenance, "Jolpica calendar"),
        ...(session ? [this.toSource(session.provenance, "OpenF1 session and timing")] : []),
        ...(curatedRace ? [{ provider: "watchcoach" as const, label: "Watchcoach learning moments" }] : []),
      ],
    };
  }

  private fromCuratedRace(race: RaceLibraryItem, sessions: readonly OpenF1Session[]): RaceCatalogItem {
    const session = this.findMatchingSession(race.date, sessions);
    return {
      ...race,
      openF1SessionKey: session?.sessionKey,
      coverage: { calendar: true, timing: Boolean(session), learning: true },
      sources: [
        { provider: "watchcoach", label: "Watchcoach deterministic fixture" },
        ...(session ? [this.toSource(session.provenance, "OpenF1 session and timing")] : []),
      ],
    };
  }

  private findMatchingSession(date: string, sessions: readonly OpenF1Session[]): OpenF1Session | undefined {
    const raceTime = Date.parse(`${date}T12:00:00Z`);
    return sessions
      .map((session) => ({ session, distance: Math.abs(Date.parse(session.startsAt) - raceTime) }))
      .filter(({ distance }) => distance <= 36 * 60 * 60 * 1_000)
      .sort((a, b) => a.distance - b.distance)[0]?.session;
  }

  private statusFromDate(date: string): RaceLibraryItem["status"] {
    const today = this.now().toISOString().slice(0, 10);
    if (date < today) return "completed";
    if (date === today) return "live";
    return "scheduled";
  }

  private toSource(provenance: ProviderProvenance, label: string): RaceCatalogSource {
    return {
      provider: provenance.provider,
      label,
      url: provenance.sourceUrl,
      fetchedAt: provenance.fetchedAt,
    };
  }
}
