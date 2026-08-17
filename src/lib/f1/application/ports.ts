import type { RaceFixtureCollection, RaceMoment } from "@/lib/f1/domain/types";

export type ImportSummary = {
  inserted: number;
  unchanged: number;
};

export type RaceCatalogEntry = {
  race: RaceFixtureCollection["races"][number];
  grandPrix: RaceFixtureCollection["grandsPrix"][number];
  moments: readonly RaceMoment[];
};

export interface RaceCatalogRepository {
  importFixtures(input: unknown): Promise<ImportSummary>;
  listRaces(): Promise<readonly RaceCatalogEntry[]>;
  findRace(season: number, round: number): Promise<RaceCatalogEntry | null>;
  findMoment(id: string): Promise<RaceMoment | null>;
}
