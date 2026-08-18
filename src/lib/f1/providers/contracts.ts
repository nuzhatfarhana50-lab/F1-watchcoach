export type ProviderName = "jolpica" | "openf1";

export type ProviderProvenance = {
  provider: ProviderName;
  externalId: string;
  sourceUrl: string;
  fetchedAt: string;
  sourceTimestamp?: string;
};

export type ProviderCircuit = {
  externalId: string;
  name: string;
  locality: string;
  country: string;
};

export type ProviderRaceSummary = {
  season: number;
  round: number;
  name: string;
  date: string;
  circuit: ProviderCircuit;
  provenance: ProviderProvenance;
};

export type ProviderDriver = {
  externalId: string;
  givenName: string;
  familyName: string;
  code?: string;
  permanentNumber?: number;
  nationality?: string;
};

export type ProviderTeam = {
  externalId: string;
  name: string;
  nationality?: string;
};

export type ProviderResult = {
  position?: number;
  gridPosition: number;
  lapsCompleted: number;
  points: number;
  status: string;
  driver: ProviderDriver;
  team: ProviderTeam;
  provenance: ProviderProvenance;
};

export type ProviderRaceResult = {
  race: ProviderRaceSummary;
  results: readonly ProviderResult[];
};

export type OpenF1Session = {
  meetingKey: number;
  sessionKey: number;
  year: number;
  name: string;
  type: string;
  country: string;
  circuitShortName: string;
  startsAt: string;
  endsAt: string;
  provenance: ProviderProvenance;
};

export type OpenF1Lap = {
  driverNumber: number;
  lapNumber: number;
  durationMs?: number;
  startedAt?: string;
  provenance: ProviderProvenance;
};

export type OpenF1Position = {
  driverNumber: number;
  position: number;
  recordedAt: string;
  provenance: ProviderProvenance;
};

export type OpenF1PitStop = {
  driverNumber: number;
  lapNumber: number;
  occurredAt: string;
  laneDurationMs?: number;
  stopDurationMs?: number;
  provenance: ProviderProvenance;
};

export type OpenF1Stint = {
  driverNumber: number;
  stintNumber: number;
  startLap: number;
  endLap?: number;
  compound: string;
  tyreAgeAtStart: number;
  provenance: ProviderProvenance;
};

export type OpenF1RaceControlEvent = {
  category: string;
  message: string;
  occurredAt: string;
  driverNumber?: number;
  lapNumber?: number;
  flag?: string;
  provenance: ProviderProvenance;
};

export type OpenF1CarData = {
  driverNumber: number;
  recordedAt: string;
  speed?: number;
  rpm?: number;
  gear?: number;
  throttle?: number;
  brake?: number;
  drs?: number;
  provenance: ProviderProvenance;
};

export type OpenF1SessionEvidence = {
  laps: readonly OpenF1Lap[];
  positions: readonly OpenF1Position[];
  pitStops: readonly OpenF1PitStop[];
  stints: readonly OpenF1Stint[];
  raceControl: readonly OpenF1RaceControlEvent[];
};

export interface HistoricalRaceProvider {
  listRaces(season: number): Promise<readonly ProviderRaceSummary[]>;
  getRaceResult(season: number, round: number): Promise<ProviderRaceResult | null>;
}

export interface RecentSessionProvider {
  findRaceSessions(year: number): Promise<readonly OpenF1Session[]>;
  getSessionEvidence(sessionKey: number): Promise<OpenF1SessionEvidence>;
  getCarData(sessionKey: number, driverNumber?: number): Promise<readonly OpenF1CarData[]>;
}
