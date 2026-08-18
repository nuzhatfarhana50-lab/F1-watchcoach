import type { OpenF1SessionEvidence } from "@/lib/f1/providers/contracts";

export const liveMomentTypes = [
  "OVERTAKE",
  "PIT_STOP",
  "STRATEGY_CHANGE",
  "SAFETY_CAR",
  "VIRTUAL_SAFETY_CAR",
  "RED_FLAG",
  "PENALTY",
  "CRASH",
  "TYRE_DEGRADATION",
] as const;

export type LiveMomentType = (typeof liveMomentTypes)[number];

export type LiveMomentCandidate = {
  id: string;
  sessionKey: number;
  type: LiveMomentType;
  title: string;
  summary: string;
  confidence: number;
  lapNumber?: number;
  occurredAt?: string;
  driverNumbers: readonly number[];
  evidenceExternalIds: readonly string[];
};

export type LiveSessionState = {
  sessionKey: number;
  status: "active" | "stale";
  updatedAt: string;
  expiresAt: string;
  checkpoint: string;
  latestLap?: number;
  evidence: OpenF1SessionEvidence;
  moments: readonly LiveMomentCandidate[];
};

export type LiveSessionReadResult =
  | { kind: "available"; state: LiveSessionState }
  | { kind: "unavailable"; reason: "not-ingested" | "cache-unavailable" };
