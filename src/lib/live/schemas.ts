import { z } from "zod";

import { liveMomentTypes } from "./types";

const provenance = z.object({
  provider: z.literal("openf1"),
  externalId: z.string().min(1),
  sourceUrl: z.string().url(),
  fetchedAt: z.string().datetime(),
  sourceTimestamp: z.string().datetime().optional(),
});

const evidence = z.object({
  laps: z.array(z.object({ driverNumber: z.number().int(), lapNumber: z.number().int(), durationMs: z.number().int().optional(), startedAt: z.string().optional(), provenance })),
  positions: z.array(z.object({ driverNumber: z.number().int(), position: z.number().int(), recordedAt: z.string(), provenance })),
  pitStops: z.array(z.object({ driverNumber: z.number().int(), lapNumber: z.number().int(), occurredAt: z.string(), laneDurationMs: z.number().int().optional(), stopDurationMs: z.number().int().optional(), provenance })),
  stints: z.array(z.object({ driverNumber: z.number().int(), stintNumber: z.number().int(), startLap: z.number().int(), endLap: z.number().int().optional(), compound: z.string(), tyreAgeAtStart: z.number(), provenance })),
  raceControl: z.array(z.object({ category: z.string(), message: z.string(), occurredAt: z.string(), driverNumber: z.number().int().optional(), lapNumber: z.number().int().optional(), flag: z.string().optional(), provenance })),
});

export const liveMomentCandidateSchema = z.object({
  id: z.string().uuid(),
  sessionKey: z.number().int().positive(),
  type: z.enum(liveMomentTypes),
  title: z.string().min(1),
  summary: z.string().min(1),
  confidence: z.number().min(0).max(1),
  lapNumber: z.number().int().positive().optional(),
  occurredAt: z.string().datetime().optional(),
  driverNumbers: z.array(z.number().int().positive()),
  evidenceExternalIds: z.array(z.string().min(1)).min(1),
});

export const liveSessionStateSchema = z.object({
  sessionKey: z.number().int().positive(),
  status: z.enum(["active", "stale"]),
  updatedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  checkpoint: z.string().min(1),
  latestLap: z.number().int().positive().optional(),
  evidence,
  moments: z.array(liveMomentCandidateSchema),
});

export const ingestionRequestSchema = z.object({
  sessionKey: z.number().int().positive(),
});
