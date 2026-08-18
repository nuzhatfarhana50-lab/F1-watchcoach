import type { ImportSummary, RaceCatalogEntry, RaceCatalogRepository } from "@/lib/f1/application/ports";
import { DomainInvariantError } from "@/lib/f1/domain/errors";
import type { RaceFixtureCollection, RaceMoment } from "@/lib/f1/domain/types";
import { validateFixtureCollection } from "@/lib/f1/domain/validateFixtureCollection";

export class InMemoryRaceCatalogRepository implements RaceCatalogRepository {
  private readonly fixtures = new Map<string, RaceFixtureCollection>();
  private readonly externalOwners = new Map<string, string>();

  async importFixtures(input: unknown): Promise<ImportSummary> {
    const fixture = validateFixtureCollection(input);
    for (const reference of fixture.externalReferences) {
      const key = `${reference.provider}:${reference.resourceType}:${reference.externalId}`;
      const owner = this.externalOwners.get(key);
      if (owner && owner !== reference.entityId) {
        throw new DomainInvariantError("duplicateExternalReference", `External reference ${key} already belongs to another entity`, { key });
      }
    }

    const identity = fixture.races.map((race) => race.id).sort().join(":");
    const unchanged = this.fixtures.has(identity) ? 1 : 0;
    this.fixtures.set(identity, fixture);
    for (const reference of fixture.externalReferences) {
      this.externalOwners.set(`${reference.provider}:${reference.resourceType}:${reference.externalId}`, reference.entityId);
    }
    return { inserted: unchanged ? 0 : 1, unchanged };
  }

  async listRaces(): Promise<readonly RaceCatalogEntry[]> {
    return [...this.fixtures.values()].flatMap((fixture) => fixture.races.map((race) => this.toEntry(fixture, race.id)));
  }

  async findRace(season: number, round: number): Promise<RaceCatalogEntry | null> {
    for (const fixture of this.fixtures.values()) {
      const seasonRecord = fixture.seasons.find((item) => item.year === season);
      const grandPrix = fixture.grandsPrix.find((item) => item.seasonId === seasonRecord?.id && item.round === round);
      const race = fixture.races.find((item) => item.grandPrixId === grandPrix?.id);
      if (race) return this.toEntry(fixture, race.id);
    }
    return null;
  }

  async findMoment(id: string): Promise<RaceMoment | null> {
    for (const fixture of this.fixtures.values()) {
      const moment = fixture.moments.find((item) => item.id === id);
      if (moment) return moment;
    }
    return null;
  }

  private toEntry(fixture: RaceFixtureCollection, raceId: string): RaceCatalogEntry {
    const race = fixture.races.find((item) => item.id === raceId)!;
    const grandPrix = fixture.grandsPrix.find((item) => item.id === race.grandPrixId)!;
    const season = fixture.seasons.find((item) => item.id === grandPrix.seasonId)!;
    const circuit = fixture.circuits.find((item) => item.id === grandPrix.circuitId)!;
    const session = fixture.sessions.find((item) => item.id === race.sessionId)!;
    return {
      race,
      grandPrix,
      season,
      circuit,
      session,
      drivers: fixture.drivers,
      teams: fixture.teams,
      sources: fixture.sources,
      moments: fixture.moments.filter((item) => item.raceId === raceId).sort((a, b) => a.sequence - b.sequence),
    };
  }
}
