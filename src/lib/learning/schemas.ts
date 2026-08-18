import { z } from "zod";

import { learningStates } from "./types";

const uuid = z.string().uuid();

export const raceProgressInputSchema = z.object({
  raceId: uuid,
  progressPercent: z.number().int().min(0).max(100),
  lastMomentId: uuid.nullable().optional(),
});

export const momentEncounterInputSchema = z.object({ raceMomentId: uuid });

export const conceptStateInputSchema = z.object({
  conceptId: uuid,
  state: z.enum(learningStates),
});

export const learningPreferencesInputSchema = z.object({
  explanationDepth: z.enum(["BEGINNER", "STANDARD", "DETAILED"]),
  learningStyle: z.enum(["BALANCED", "VISUAL", "TECHNICAL"]),
  interests: z.array(z.string().trim().min(1).max(80)).max(12),
  driverIds: z.array(uuid).max(8),
  teamIds: z.array(uuid).max(8),
});

export type RaceProgressInput = z.infer<typeof raceProgressInputSchema>;
export type MomentEncounterInput = z.infer<typeof momentEncounterInputSchema>;
export type ConceptStateInput = z.infer<typeof conceptStateInputSchema>;
export type LearningPreferencesInput = z.infer<typeof learningPreferencesInputSchema>;
