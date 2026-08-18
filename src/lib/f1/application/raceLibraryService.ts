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
