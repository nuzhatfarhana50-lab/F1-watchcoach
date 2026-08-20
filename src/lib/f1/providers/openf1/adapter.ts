import type { z } from "zod";

import type {
  OpenF1CarData,
  OpenF1Session,
  OpenF1SessionEvidence,
  ProviderProvenance,
  RecentSessionProvider,
} from "../contracts";
import { ProviderFailure } from "../errors";
import type { ProviderRequestClient, ProviderResponse } from "../requestClient";
import {
  openF1CarDataSchema,
  openF1LapSchema,
  openF1PitSchema,
  openF1PositionSchema,
  openF1RaceControlSchema,
  openF1SessionSchema,
  openF1StintSchema,
} from "./schemas";

const RECENT_TTL_MS = 5 * 60 * 1_000;
const LIVE_TTL_MS = 5_000;

export class OpenF1Adapter implements RecentSessionProvider {
  constructor(
    private readonly client: ProviderRequestClient,
    private readonly baseUrl = "https://api.openf1.org/v1/",
  ) {}

  async findRaceSessions(year: number): Promise<readonly OpenF1Session[]> {
    if (!Number.isInteger(year) || year < 2023 || year > 2200) {
      throw new ProviderFailure("unsupported", "openf1", "OpenF1 historical coverage begins in 2023", { year });
    }
    const response = await this.get("sessions", { year, session_name: "Race" }, RECENT_TTL_MS);
    return this.parseArray(openF1SessionSchema, response)
      .filter((session) => session.session_name === "Race" && !session.is_cancelled)
      .map((session) => ({
      meetingKey: session.meeting_key,
      sessionKey: session.session_key,
      year: session.year,
      name: session.session_name,
      type: session.session_type,
      country: session.country_name,
      circuitShortName: session.circuit_short_name,
      startsAt: session.date_start,
      endsAt: session.date_end,
      provenance: this.provenance(String(session.session_key), response, session.date_start),
      }));
  }

  async getSessionEvidence(sessionKey: number): Promise<OpenF1SessionEvidence> {
    this.assertSessionKey(sessionKey);
    const [laps, positions, pits, stints, raceControl] = await Promise.all([
      this.get("laps", { session_key: sessionKey }, LIVE_TTL_MS),
      this.get("position", { session_key: sessionKey }, LIVE_TTL_MS),
      this.get("pit", { session_key: sessionKey }, LIVE_TTL_MS),
      this.get("stints", { session_key: sessionKey }, LIVE_TTL_MS),
      this.get("race_control", { session_key: sessionKey }, LIVE_TTL_MS),
    ]);
    return {
      laps: this.parseArray(openF1LapSchema, laps).map((lap) => ({
        driverNumber: lap.driver_number,
        lapNumber: lap.lap_number,
        durationMs: lap.lap_duration == null ? undefined : Math.round(lap.lap_duration * 1_000),
        startedAt: lap.date_start ?? undefined,
        provenance: this.provenance(`${sessionKey}:${lap.driver_number}:${lap.lap_number}`, laps, lap.date_start ?? undefined),
      })),
      positions: this.parseArray(openF1PositionSchema, positions).map((position, index) => ({
        driverNumber: position.driver_number,
        position: position.position,
        recordedAt: position.date,
        provenance: this.provenance(`${sessionKey}:${position.driver_number}:${index}`, positions, position.date),
      })),
      pitStops: this.parseArray(openF1PitSchema, pits).map((pit, index) => ({
        driverNumber: pit.driver_number,
        lapNumber: pit.lap_number,
        occurredAt: pit.date,
        laneDurationMs: pit.lane_duration == null ? undefined : Math.round(pit.lane_duration * 1_000),
        stopDurationMs: pit.stop_duration == null ? undefined : Math.round(pit.stop_duration * 1_000),
        provenance: this.provenance(`${sessionKey}:${pit.driver_number}:${pit.lap_number}:${index}`, pits, pit.date),
      })),
      stints: this.parseArray(openF1StintSchema, stints).map((stint) => ({
        driverNumber: stint.driver_number,
        stintNumber: stint.stint_number,
        startLap: stint.lap_start,
        endLap: stint.lap_end ?? undefined,
        compound: (stint.compound ?? "UNKNOWN").toLowerCase(),
        tyreAgeAtStart: stint.tyre_age_at_start ?? 0,
        provenance: this.provenance(`${sessionKey}:${stint.driver_number}:${stint.stint_number}`, stints),
      })),
      raceControl: this.parseArray(openF1RaceControlSchema, raceControl).map((event, index) => ({
        category: event.category,
        message: event.message,
        occurredAt: event.date,
        driverNumber: event.driver_number ?? undefined,
        lapNumber: event.lap_number ?? undefined,
        flag: event.flag ?? undefined,
        provenance: this.provenance(`${sessionKey}:${index}`, raceControl, event.date),
      })),
    };
  }

  async getCarData(sessionKey: number, driverNumber?: number): Promise<readonly OpenF1CarData[]> {
    this.assertSessionKey(sessionKey);
    const response = await this.get(
      "car_data",
      { session_key: sessionKey, driver_number: driverNumber },
      LIVE_TTL_MS,
    );
    return this.parseArray(openF1CarDataSchema, response).map((record, index) => ({
      driverNumber: record.driver_number,
      recordedAt: record.date,
      speed: record.speed ?? undefined,
      rpm: record.rpm ?? undefined,
      gear: record.n_gear ?? undefined,
      throttle: record.throttle ?? undefined,
      brake: record.brake ?? undefined,
      drs: record.drs ?? undefined,
      provenance: this.provenance(`${sessionKey}:${record.driver_number}:${index}`, response, record.date),
    }));
  }

  private async get(endpoint: string, query: Record<string, string | number | undefined>, cacheTtlMs: number) {
    const url = new URL(endpoint, this.baseUrl);
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
    return this.client.get({ provider: "openf1", url: url.toString(), cacheTtlMs });
  }

  private parseArray<T extends z.ZodType>(schema: T, response: ProviderResponse): z.infer<T>[] {
    const parsed = schema.array().safeParse(response.data);
    if (!parsed.success) {
      throw new ProviderFailure("schemaDrift", "openf1", "OpenF1 response did not match the expected contract", {
        sourceUrl: response.sourceUrl,
        issueCount: parsed.error.issues.length,
      });
    }
    return parsed.data;
  }

  private provenance(externalId: string, response: ProviderResponse, sourceTimestamp?: string): ProviderProvenance {
    return { provider: "openf1", externalId, sourceUrl: response.sourceUrl, fetchedAt: response.fetchedAt, sourceTimestamp };
  }

  private assertSessionKey(sessionKey: number): void {
    if (!Number.isInteger(sessionKey) || sessionKey < 1) {
      throw new ProviderFailure("invalidRequest", "openf1", "Session key must be a positive integer", { sessionKey });
    }
  }
}
