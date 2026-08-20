import { z } from "zod";

export const raceQuestionInputSchema = z.object({
  question: z.string().trim().min(3, "Ask a little more about the race.").max(300, "Keep the question under 300 characters."),
});

export const raceQuestionSourceSchema = z.object({
  id: z.string().min(1),
  provider: z.string().min(1),
  title: z.string().min(1),
  url: z.string().url(),
});

const raceQuestionResultFactSchema = z.object({
  position: z.number().int().positive().optional(),
  gridPosition: z.number().int().nonnegative(),
  lapsCompleted: z.number().int().nonnegative(),
  points: z.number().nonnegative(),
  status: z.string().min(1),
  driver: z.string().min(1),
  team: z.string().min(1),
});

const raceQuestionMomentFactSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  lapNumber: z.number().int().positive().optional(),
  whatHappened: z.string().min(1),
  whyItHappened: z.string().min(1),
  whyItMatters: z.string().min(1),
  watchNext: z.string().min(1),
  concepts: z.array(z.object({ name: z.string().min(1), definition: z.string().min(1) })),
});

export const raceQuestionContextSchema = z.object({
  question: z.string().min(1),
  race: z.object({
    season: z.number().int().min(1950),
    round: z.number().int().positive(),
    name: z.string().min(1),
    date: z.string().min(1),
    circuit: z.string().min(1),
    locality: z.string().min(1),
    country: z.string().min(1),
  }),
  results: z.array(raceQuestionResultFactSchema),
  moments: z.array(raceQuestionMomentFactSchema),
  sources: z.array(raceQuestionSourceSchema).min(1),
});

export const generatedRaceQuestionAnswerSchema = z.object({
  answer: z.string().trim().min(1).max(2_000),
  sourceIds: z.array(z.string().min(1)).min(1).max(8),
});

export const generatedRaceQuestionAnswerJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    answer: { type: "string", minLength: 1, maxLength: 2_000 },
    sourceIds: { type: "array", minItems: 1, maxItems: 8, items: { type: "string", minLength: 1 } },
  },
  required: ["answer", "sourceIds"],
} as const;

export type RaceQuestionContext = z.infer<typeof raceQuestionContextSchema>;
export type RaceQuestionSource = z.infer<typeof raceQuestionSourceSchema>;
export type GeneratedRaceQuestionAnswer = z.infer<typeof generatedRaceQuestionAnswerSchema>;
