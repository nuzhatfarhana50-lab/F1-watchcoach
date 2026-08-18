import type { OpenF1SessionEvidence, ProviderProvenance } from "@/lib/f1/providers/contracts";

const fetchedAt = "2024-07-07T15:10:00.000Z";
const sourceUrl = "https://api.openf1.org/v1/replay?session_key=9539";
const provenance = (externalId: string, sourceTimestamp?: string): ProviderProvenance => ({
  provider: "openf1",
  externalId,
  sourceUrl,
  fetchedAt,
  sourceTimestamp,
});

export const britishReplayEvidence: OpenF1SessionEvidence = {
  laps: [
    { driverNumber: 44, lapNumber: 38, durationMs: 91_234, startedAt: "2024-07-07T15:01:00.000Z", provenance: provenance("lap:44:38") },
    { driverNumber: 4, lapNumber: 38, durationMs: 92_105, startedAt: "2024-07-07T15:01:01.000Z", provenance: provenance("lap:4:38") },
  ],
  positions: [
    { driverNumber: 44, position: 5, recordedAt: "2024-07-07T15:00:00.000Z", provenance: provenance("position:44:before") },
    { driverNumber: 44, position: 4, recordedAt: "2024-07-07T15:00:05.000Z", provenance: provenance("position:44:after") },
  ],
  pitStops: [
    { driverNumber: 44, lapNumber: 38, occurredAt: "2024-07-07T15:01:32.000Z", laneDurationMs: 28_400, provenance: provenance("pit:44:38") },
  ],
  stints: [
    { driverNumber: 44, stintNumber: 2, startLap: 39, endLap: 52, compound: "soft", tyreAgeAtStart: 0, provenance: provenance("stint:44:2") },
  ],
  raceControl: [
    { category: "SafetyCar", message: "VIRTUAL SAFETY CAR DEPLOYED", occurredAt: "2024-07-07T14:45:00.000Z", lapNumber: 25, flag: "YELLOW", provenance: provenance("control:vsc") },
    { category: "Penalty", message: "CAR 10 TIME PENALTY", occurredAt: "2024-07-07T14:50:00.000Z", driverNumber: 10, lapNumber: 28, provenance: provenance("control:penalty") },
    { category: "Flag", message: "CHEQUERED FLAG", occurredAt: "2024-07-07T15:22:27.000Z", lapNumber: 52, flag: "CHEQUERED", provenance: provenance("control:finish") },
  ],
};

export const britishReplayLabels = [
  "OVERTAKE:position:44:before",
  "PIT_STOP:pit:44:38",
  "STRATEGY_CHANGE:stint:44:2",
  "VIRTUAL_SAFETY_CAR:control:vsc",
  "PENALTY:control:penalty",
] as const;
