import type { RaceCatalogEntry, RaceCatalogRepository } from "./ports";

export type RaceLibraryItem = {
  id: string;
  season: number;
  round: number;
  name: string;
  officialName: string;
  date: string;
  circuit: { name: string; locality?: string; country: string };
  status: "scheduled" | "live" | "completed" | "cancelled";
  laps?: number;
  momentCount: number;
  href: string;
};

export type RaceMomentPreview = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  type: string;
  lapNumber?: number;
  importance: number;
  evidenceCount: number;
  concepts: readonly { slug: string; name: string; category: string }[];
};

export type RaceDetailReadModel = RaceLibraryItem & {
  startsAt: string;
  moments: readonly RaceMomentPreview[];
};

export type RaceLookupResult =
  | { kind: "found"; race: RaceDetailReadModel }
  | { kind: "unsupported"; season: number; supportedSeasons: readonly number[] }
  | { kind: "notFound" };

export type MomentEvidenceReadModel = {
  id: string;
  type: "pitStop" | "tyreStint" | "position" | "raceControl";
  label: string;
  detail: string;
  sourceIds: readonly string[];
};

export type MomentDetailReadModel = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  type: string;
  lapNumber?: number;
  race: RaceLibraryItem;
  drivers: readonly { id: string; name: string; role: string }[];
  teams: readonly { id: string; name: string; role: string }[];
  evidence: readonly MomentEvidenceReadModel[];
  telemetryAvailable: boolean;
  explanation: {
    whatHappened: string;
    whyItHappened: string;
    whyItMatters: string;
    watchNext: string;
  };
  concepts: readonly { id: string; slug: string; name: string; category: string; definition: string }[];
  media: readonly { id: string; kind: string; title: string; url: string; attribution: string; startTimestampSeconds?: number }[];
  connections: readonly {
    id: string;
    reason: string;
    explanation: string;
    targetTitle: string;
    targetRaceName: string;
    href: string;
  }[];
  sources: readonly { id: string; provider: string; title: string; url: string }[];
};

export type MomentLookupResult =
  | { kind: "found"; moment: MomentDetailReadModel }
  | { kind: "unsupported"; season: number; supportedSeasons: readonly number[] }
  | { kind: "notFound" };

export class RaceLibraryService {
  constructor(private readonly repository: RaceCatalogRepository) {}

  async listRaces(): Promise<readonly RaceLibraryItem[]> {
    const entries = await this.repository.listRaces();
    return entries
      .map((entry) => this.toLibraryItem(entry))
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  async getRace(season: number, round: number): Promise<RaceLookupResult> {
    const entries = await this.repository.listRaces();
    const supportedSeasons = [...new Set(entries.map((entry) => entry.season.year))].sort((a, b) => b - a);
    if (!supportedSeasons.includes(season)) return { kind: "unsupported", season, supportedSeasons };

    const entry = await this.repository.findRace(season, round);
    if (!entry) return { kind: "notFound" };
    return {
      kind: "found",
      race: {
        ...this.toLibraryItem(entry),
        startsAt: entry.session.startsAt,
        moments: entry.moments.map((moment) => ({
          id: moment.id,
          slug: moment.slug,
          title: moment.title,
          summary: moment.summary,
          type: moment.type,
          lapNumber: moment.lapNumber,
          importance: moment.importance,
          evidenceCount: moment.evidence.length,
          concepts: moment.concepts.map((concept) => ({
            slug: concept.slug,
            name: concept.name,
            category: concept.category,
          })),
        })),
      },
    };
  }

  async getMoment(season: number, round: number, slug: string): Promise<MomentLookupResult> {
    const raceResult = await this.getRace(season, round);
    if (raceResult.kind !== "found") return raceResult;

    const entry = await this.repository.findRace(season, round);
    const moment = entry?.moments.find((candidate) => candidate.slug === slug);
    if (!entry || !moment) return { kind: "notFound" };

    const driverById = new Map(entry.drivers.map((driver) => [driver.id, driver]));
    const teamById = new Map(entry.teams.map((team) => [team.id, team]));
    const sourceIds = new Set<string>(moment.sourceIds);
    for (const evidence of moment.evidence) evidence.sourceIds.forEach((id) => sourceIds.add(id));
    moment.explanation.sourceIds.forEach((id) => sourceIds.add(id));
    moment.concepts.forEach((concept) => concept.sourceIds.forEach((id) => sourceIds.add(id)));
    moment.media.forEach((media) => media.sourceIds.forEach((id) => sourceIds.add(id)));
    moment.connections.forEach((connection) => connection.sourceIds.forEach((id) => sourceIds.add(id)));

    const allRaces = await this.repository.listRaces();
    const connections = moment.connections.flatMap((connection) => {
      const targetEntry = allRaces.find((candidate) => candidate.moments.some((item) => item.id === connection.targetMomentId));
      const target = targetEntry?.moments.find((item) => item.id === connection.targetMomentId);
      if (!targetEntry || !target) return [];
      return [{
        id: connection.id,
        reason: connection.reason,
        explanation: connection.explanation,
        targetTitle: target.title,
        targetRaceName: targetEntry.grandPrix.shortName,
        href: `/races/${targetEntry.season.year}/${targetEntry.grandPrix.round}/moments/${target.slug}`,
      }];
    });

    return {
      kind: "found",
      moment: {
        id: moment.id,
        slug: moment.slug,
        title: moment.title,
        summary: moment.summary,
        type: moment.type,
        lapNumber: moment.lapNumber,
        race: raceResult.race,
        drivers: moment.drivers.flatMap((participant) => {
          const driver = driverById.get(participant.entityId);
          return driver ? [{ id: driver.id, name: `${driver.givenName} ${driver.familyName}`, role: participant.role }] : [];
        }),
        teams: moment.teams.flatMap((participant) => {
          const team = teamById.get(participant.entityId);
          return team ? [{ id: team.id, name: team.canonicalName, role: participant.role }] : [];
        }),
        evidence: moment.evidence.map((evidence) => this.toEvidenceReadModel(evidence, driverById)),
        telemetryAvailable: false,
        explanation: {
          whatHappened: moment.explanation.whatHappened,
          whyItHappened: moment.explanation.whyItHappened,
          whyItMatters: moment.explanation.whyItMatters,
          watchNext: moment.explanation.watchNext,
        },
        concepts: moment.concepts.map((concept) => ({
          id: concept.id,
          slug: concept.slug,
          name: concept.name,
          category: concept.category,
          definition: concept.definition,
        })),
        media: moment.media.map((media) => ({
          id: media.id,
          kind: media.kind,
          title: media.title,
          url: media.url,
          attribution: media.attribution,
          startTimestampSeconds: media.startTimestampSeconds,
        })),
        connections,
        sources: entry.sources.filter((source) => sourceIds.has(source.id)).map((source) => ({
          id: source.id,
          provider: source.provider,
          title: source.title,
          url: source.url,
        })),
      },
    };
  }

  private toEvidenceReadModel(
    evidence: RaceCatalogEntry["moments"][number]["evidence"][number],
    driverById: ReadonlyMap<string, RaceCatalogEntry["drivers"][number]>,
  ): MomentEvidenceReadModel {
    if (evidence.type === "pitStop") {
      const driver = driverById.get(evidence.driverId);
      const duration = evidence.stationaryDurationSeconds ? ` · ${evidence.stationaryDurationSeconds.toFixed(1)}s stationary` : "";
      return { id: evidence.id, type: evidence.type, label: `${driver?.familyName ?? "Driver"} pit stop`, detail: `Lap ${evidence.lap} · ${evidence.tyreCompound} tyres${duration}`, sourceIds: evidence.sourceIds };
    }
    if (evidence.type === "tyreStint") {
      const driver = driverById.get(evidence.driverId);
      return { id: evidence.id, type: evidence.type, label: `${driver?.familyName ?? "Driver"} tyre stint`, detail: `Laps ${evidence.startLap}–${evidence.endLap} · ${evidence.tyreCompound} tyres`, sourceIds: evidence.sourceIds };
    }
    if (evidence.type === "position") {
      const driver = driverById.get(evidence.driverId);
      return { id: evidence.id, type: evidence.type, label: `${driver?.familyName ?? "Driver"} position`, detail: `P${evidence.position} on lap ${evidence.lap}`, sourceIds: evidence.sourceIds };
    }
    return { id: evidence.id, type: evidence.type, label: "Race control", detail: `${evidence.lap ? `Lap ${evidence.lap} · ` : ""}${evidence.message}`, sourceIds: evidence.sourceIds };
  }

  private toLibraryItem(entry: RaceCatalogEntry): RaceLibraryItem {
    return {
      id: entry.race.id,
      season: entry.season.year,
      round: entry.grandPrix.round,
      name: entry.grandPrix.shortName,
      officialName: entry.grandPrix.officialName,
      date: entry.grandPrix.endDate,
      circuit: {
        name: entry.circuit.name,
        locality: entry.circuit.locality,
        country: entry.circuit.country,
      },
      status: entry.race.status,
      laps: entry.race.actualLaps ?? entry.race.scheduledLaps,
      momentCount: entry.moments.length,
      href: `/races/${entry.season.year}/${entry.grandPrix.round}`,
    };
  }
}
