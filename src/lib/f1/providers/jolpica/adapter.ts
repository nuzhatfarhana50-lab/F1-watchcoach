import { z } from "zod";

import type {
  HistoricalRaceProvider,
  ProviderDriver,
  ProviderDriverCareer,
  ProviderDriverStanding,
  ProviderProvenance,
  ProviderRaceResult,
  ProviderRaceSummary,
} from "../contracts";
import { ProviderFailure } from "../errors";
import type { ProviderRequestClient, ProviderResponse } from "../requestClient";
import { jolpicaDriversResponseSchema, jolpicaDriverStandingsResponseSchema, jolpicaRaceResponseSchema, type JolpicaRace } from "./schemas";

const HISTORICAL_TTL_MS = 24 * 60 * 60 * 1_000;
const CAREER_PAGE_SIZE = 100;
const MAX_CAREER_RESULTS = 2_000;
const MAX_DRIVER_DIRECTORY_SIZE = 2_000;

export class JolpicaAdapter implements HistoricalRaceProvider {
  constructor(
    private readonly client: ProviderRequestClient,
    private readonly baseUrl = "https://api.jolpi.ca/ergast/f1/",
  ) {}

  async listRaces(season: number): Promise<readonly ProviderRaceSummary[]> {
    this.assertSeason(season);
    const response = await this.get(`${season}/races.json?limit=100`);
    const races = this.parse(response).MRData.RaceTable.Races;
    return races.map((race) => this.toRaceSummary(race, response));
  }

  async getRaceResult(season: number, round: number): Promise<ProviderRaceResult | null> {
    this.assertSeason(season);
    if (!Number.isInteger(round) || round < 1) {
      throw new ProviderFailure("invalidRequest", "jolpica", "Round must be a positive integer", { round });
    }
    const response = await this.get(`${season}/${round}/results.json?limit=100`);
    const race = this.parse(response).MRData.RaceTable.Races[0];
    if (!race) return null;
    const provenance = this.provenance(race, response);
    return {
      race: this.toRaceSummary(race, response),
      results: (race.Results ?? []).map((result) => ({
        position: result.position ? Number(result.position) : undefined,
        gridPosition: Number(result.grid),
        lapsCompleted: Number(result.laps),
        points: Number(result.points),
        status: result.status,
        driver: {
          externalId: result.Driver.driverId,
          givenName: result.Driver.givenName,
          familyName: result.Driver.familyName,
          code: result.Driver.code,
          permanentNumber: result.Driver.permanentNumber ? Number(result.Driver.permanentNumber) : undefined,
          nationality: result.Driver.nationality,
        },
        team: {
          externalId: result.Constructor.constructorId,
          name: result.Constructor.name,
          nationality: result.Constructor.nationality,
        },
        provenance,
      })),
    };
  }

  async listDrivers(): Promise<readonly ProviderDriver[]> {
    const drivers: ProviderDriver[] = [];
    let offset = 0;
    let total = 0;
    do {
      const response = await this.get(`drivers.json?limit=${CAREER_PAGE_SIZE}&offset=${offset}`);
      const parsed = jolpicaDriversResponseSchema.safeParse(response.data);
      if (!parsed.success) {
        throw new ProviderFailure("schemaDrift", "jolpica", "Jolpica driver directory did not match the expected contract", {
          sourceUrl: response.sourceUrl,
          issueCount: parsed.error.issues.length,
        });
      }
      const pageLimit = Number(parsed.data.MRData.limit ?? CAREER_PAGE_SIZE);
      total = Number(parsed.data.MRData.total ?? parsed.data.MRData.DriverTable.Drivers.length);
      if (!Number.isInteger(pageLimit) || pageLimit < 1 || !Number.isInteger(total) || total < 0) {
        throw new ProviderFailure("schemaDrift", "jolpica", "Jolpica driver-directory pagination metadata was invalid", {
          sourceUrl: response.sourceUrl,
        });
      }
      if (total > MAX_DRIVER_DIRECTORY_SIZE) {
        throw new ProviderFailure("unsupported", "jolpica", "Jolpica driver directory exceeded the supported pagination bound", {
          total,
        });
      }
      drivers.push(...parsed.data.MRData.DriverTable.Drivers.map((driver) => ({
        externalId: driver.driverId,
        givenName: driver.givenName,
        familyName: driver.familyName,
        code: driver.code,
        permanentNumber: driver.permanentNumber ? Number(driver.permanentNumber) : undefined,
        nationality: driver.nationality,
      })));
      offset += pageLimit;
      if (parsed.data.MRData.DriverTable.Drivers.length === 0) break;
    } while (offset < total);

    return [...new Map(drivers.map((driver) => [driver.externalId, driver])).values()];
  }

  async getDriverCareer(driverExternalId: string): Promise<ProviderDriverCareer | null> {
    if (!/^[a-z0-9_-]+$/i.test(driverExternalId)) {
      throw new ProviderFailure("invalidRequest", "jolpica", "Driver identifier is invalid");
    }
    const pages: { response: ProviderResponse; races: readonly JolpicaRace[] }[] = [];
    let offset = 0;
    let total = 0;
    do {
      const response = await this.get(`drivers/${encodeURIComponent(driverExternalId)}/results.json?limit=${CAREER_PAGE_SIZE}&offset=${offset}`);
      const parsed = this.parse(response);
      const pageLimit = Number(parsed.MRData.limit ?? CAREER_PAGE_SIZE);
      total = Number(parsed.MRData.total ?? parsed.MRData.RaceTable.Races.length);
      if (!Number.isInteger(pageLimit) || pageLimit < 1 || !Number.isInteger(total) || total < 0) {
        throw new ProviderFailure("schemaDrift", "jolpica", "Jolpica career pagination metadata was invalid", {
          sourceUrl: response.sourceUrl,
        });
      }
      if (total > MAX_CAREER_RESULTS) {
        throw new ProviderFailure("unsupported", "jolpica", "Jolpica career result set exceeded the supported pagination bound", {
          driverExternalId,
          total,
        });
      }
      pages.push({ response, races: parsed.MRData.RaceTable.Races });
      offset += pageLimit;
      if (parsed.MRData.RaceTable.Races.length === 0) break;
    } while (offset < total);

    const firstResponse = pages[0]?.response;
    const results = pages.flatMap(({ races, response }) => races.flatMap((race) => (race.Results ?? []).map((result) => {
      const provenance = this.provenance(race, response);
      return {
        season: Number(race.season),
        round: Number(race.round),
        raceName: race.raceName,
        raceDate: race.date,
        position: result.position ? Number(result.position) : undefined,
        gridPosition: Number(result.grid),
        lapsCompleted: Number(result.laps),
        points: Number(result.points),
        status: result.status,
        driver: {
          externalId: result.Driver.driverId,
          givenName: result.Driver.givenName,
          familyName: result.Driver.familyName,
          code: result.Driver.code,
          permanentNumber: result.Driver.permanentNumber ? Number(result.Driver.permanentNumber) : undefined,
          nationality: result.Driver.nationality,
        },
        team: {
          externalId: result.Constructor.constructorId,
          name: result.Constructor.name,
          nationality: result.Constructor.nationality,
        },
        provenance,
      };
    })));
    const first = results[0];
    const last = results.at(-1);
    if (!first || !last || !firstResponse) return null;
    return {
      driver: first.driver,
      firstSeason: Math.min(...results.map((result) => result.season)),
      lastSeason: Math.max(...results.map((result) => result.season)),
      starts: results.length,
      wins: results.filter((result) => result.position === 1).length,
      podiums: results.filter((result) => result.position !== undefined && result.position <= 3).length,
      results,
      provenance: {
        provider: "jolpica",
        externalId: `driver:${first.driver.externalId}:results`,
        sourceUrl: firstResponse.sourceUrl,
        fetchedAt: firstResponse.fetchedAt,
      },
    };
  }

  async getDriverStandings(season: number): Promise<readonly ProviderDriverStanding[]> {
    this.assertSeason(season);
    const response = await this.get(`${season}/driverstandings.json?limit=100`);
    const parsed = jolpicaDriverStandingsResponseSchema.safeParse(response.data);
    if (!parsed.success) {
      throw new ProviderFailure("schemaDrift", "jolpica", "Jolpica standings response did not match the expected contract", {
        sourceUrl: response.sourceUrl,
        issueCount: parsed.error.issues.length,
      });
    }
    const standings = parsed.data.MRData.StandingsTable.StandingsLists[0];
    if (!standings) return [];
    return standings.DriverStandings.map((standing) => ({
      season: Number(standings.season),
      position: Number(standing.position),
      points: Number(standing.points),
      wins: Number(standing.wins),
      driver: {
        externalId: standing.Driver.driverId,
        givenName: standing.Driver.givenName,
        familyName: standing.Driver.familyName,
        code: standing.Driver.code,
        permanentNumber: standing.Driver.permanentNumber ? Number(standing.Driver.permanentNumber) : undefined,
        nationality: standing.Driver.nationality,
      },
      teams: standing.Constructors.map((team) => ({ externalId: team.constructorId, name: team.name, nationality: team.nationality })),
      provenance: {
        provider: "jolpica",
        externalId: `${standings.season}:driver-standing:${standing.position}`,
        sourceUrl: response.sourceUrl,
        fetchedAt: response.fetchedAt,
      },
    }));
  }

  private async get(path: string): Promise<ProviderResponse> {
    return this.client.get({
      provider: "jolpica",
      url: new URL(path, this.baseUrl).toString(),
      cacheTtlMs: HISTORICAL_TTL_MS,
      headers: { "User-Agent": "F1Watchcoach/0.1.0" },
    });
  }

  private parse(response: ProviderResponse): z.infer<typeof jolpicaRaceResponseSchema> {
    const parsed = jolpicaRaceResponseSchema.safeParse(response.data);
    if (!parsed.success) {
      throw new ProviderFailure("schemaDrift", "jolpica", "Jolpica response did not match the expected contract", {
        sourceUrl: response.sourceUrl,
        issueCount: parsed.error.issues.length,
      });
    }
    return parsed.data;
  }

  private toRaceSummary(race: JolpicaRace, response: ProviderResponse): ProviderRaceSummary {
    return {
      season: Number(race.season),
      round: Number(race.round),
      name: race.raceName,
      date: race.date,
      circuit: {
        externalId: race.Circuit.circuitId,
        name: race.Circuit.circuitName,
        locality: race.Circuit.Location.locality,
        country: race.Circuit.Location.country,
      },
      provenance: this.provenance(race, response),
    };
  }

  private provenance(race: JolpicaRace, response: ProviderResponse): ProviderProvenance {
    return {
      provider: "jolpica",
      externalId: `${race.season}:${race.round}`,
      sourceUrl: response.sourceUrl,
      fetchedAt: response.fetchedAt,
    };
  }

  private assertSeason(season: number): void {
    if (!Number.isInteger(season) || season < 1950 || season > 2200) {
      throw new ProviderFailure("unsupported", "jolpica", "Season is outside Formula 1 history", { season });
    }
  }
}
