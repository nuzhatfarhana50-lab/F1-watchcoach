import type { OpenF1SessionEvidence, ProviderProvenance } from "@/lib/f1/providers/contracts";

const empty = (): OpenF1SessionEvidence => ({ laps: [], positions: [], pitStops: [], stints: [], raceControl: [] });
const source = (scenario: string, id: string): ProviderProvenance => ({
  provider: "openf1",
  externalId: `${scenario}:${id}`,
  sourceUrl: `https://api.openf1.org/v1/race_control?session_key=${encodeURIComponent(scenario)}`,
  fetchedAt: "2024-01-01T12:00:00.000Z",
});

export const dryStrategyReplay: OpenF1SessionEvidence = {
  ...empty(),
  pitStops: [{ driverNumber: 16, lapNumber: 21, occurredAt: "2024-01-01T12:21:00.000Z", provenance: source("dry", "pit") }],
  stints: [{ driverNumber: 16, stintNumber: 2, startLap: 22, compound: "hard", tyreAgeAtStart: 0, provenance: source("dry", "stint") }],
};

export const safetyAndRedFlagReplay: OpenF1SessionEvidence = {
  ...empty(),
  raceControl: [
    { category: "SafetyCar", message: "SAFETY CAR DEPLOYED", occurredAt: "2024-01-01T12:10:00.000Z", lapNumber: 10, provenance: source("neutralization", "safety-car") },
    { category: "Flag", message: "RED FLAG", occurredAt: "2024-01-01T12:12:00.000Z", lapNumber: 11, flag: "RED", provenance: source("neutralization", "red-flag") },
  ],
};

export const incidentHeavyReplay: OpenF1SessionEvidence = {
  ...empty(),
  raceControl: [
    { category: "Other", message: "CAR 18 STOPPED ON TRACK - INCIDENT", occurredAt: "2024-01-01T12:05:00.000Z", driverNumber: 18, lapNumber: 5, provenance: source("incident", "stopped") },
    { category: "Penalty", message: "CAR 27 TEN SECOND PENALTY", occurredAt: "2024-01-01T12:08:00.000Z", driverNumber: 27, lapNumber: 7, provenance: source("incident", "penalty") },
    { category: "Other", message: "TYRE DEBRIS AT TURN 4", occurredAt: "2024-01-01T12:09:00.000Z", lapNumber: 8, provenance: source("incident", "tyre") },
  ],
};
