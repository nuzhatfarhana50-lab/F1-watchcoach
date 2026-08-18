import { z } from "zod";

import type {
  HistoricalRaceProvider,
  ProviderProvenance,
  ProviderRaceResult,
  ProviderRaceSummary,
} from "../contracts";
import { ProviderFailure } from "../errors";
import type { ProviderRequestClient, ProviderResponse } from "../requestClient";
import { jolpicaRaceResponseSchema, type JolpicaRace } from "./schemas";

const HISTORICAL_TTL_MS = 24 * 60 * 60 * 1_000;

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
