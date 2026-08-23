import { z } from "zod";

import { raceQuestionLimits } from "./raceQuestionLimits";

export const f1ScopeSchema = z.enum(["F1_IN_SCOPE", "F1_RELATED_CONTEXT", "OUT_OF_SCOPE"]);

export const f1QueryIntentSchema = z.enum([
  "DRIVER_PROFILE", "DRIVER_CAREER", "DRIVER_TRANSFER", "TEAM_PROFILE", "TEAM_HISTORY", "RACE_RESULT",
  "RACE_MOMENT", "SEASON", "CHAMPIONSHIP", "CIRCUIT", "STATISTICS", "STRATEGY", "TECHNICAL",
  "REGULATIONS", "FIA_DECISION", "BUSINESS", "HISTORY", "RIVALRY", "CONTROVERSY", "CURRENT_NEWS",
  "MEDIA", "COMPARISON", "GENERAL_F1",
]);

export const f1EntityReferenceSchema = z.object({
  type: z.enum(["DRIVER", "TEAM", "CIRCUIT", "RACE", "CONCEPT", "PERSON", "ORGANIZATION", "SEASON"]),
  query: z.string().trim().min(1).max(120),
  name: z.string().trim().min(1).max(120),
  id: z.string().min(1).optional(),
  externalId: z.string().min(1).optional(),
});

export const f1ConversationTurnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  text: z.string().trim().min(1).max(raceQuestionLimits.conversationTurnCharacters),
  entities: z.array(f1EntityReferenceSchema).max(8).default([]),
});

export const raceQuestionInputSchema = z.object({
  question: z.string().trim().min(3, "Ask a little more about the race.").max(raceQuestionLimits.questionCharacters, "Keep the question under 300 characters."),
  conversation: z.array(f1ConversationTurnSchema).max(raceQuestionLimits.conversationTurns).default([]),
});

export const f1QueryPlanSchema = z.object({
  scope: f1ScopeSchema.exclude(["OUT_OF_SCOPE"]),
  intents: z.array(f1QueryIntentSchema).min(1),
  entities: z.array(f1EntityReferenceSchema),
  currentness: z.enum(["NONE", "HISTORICAL", "CURRENT", "CURRENT_AND_HISTORICAL"]),
  needsStructuredData: z.boolean(),
  needsRaceMoments: z.boolean(),
  needsSemanticRetrieval: z.boolean(),
  needsWebSearch: z.boolean(),
  needsMedia: z.boolean(),
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
  type: z.string().min(1).optional(),
  title: z.string().min(1),
  summary: z.string().min(1),
  lapNumber: z.number().int().positive().optional(),
  whatHappened: z.string().min(1),
  whyItHappened: z.string().min(1),
  whyItMatters: z.string().min(1),
  watchNext: z.string().min(1),
  concepts: z.array(z.object({ name: z.string().min(1), definition: z.string().min(1) })),
  media: z.array(z.object({
    id: z.string().min(1),
    kind: z.string().min(1),
    title: z.string().min(1),
    url: z.string().url(),
    attribution: z.string().min(1),
  })).default([]),
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
  answer: z.string().trim().min(1).max(raceQuestionLimits.answerCharacters),
  sourceIds: z.array(z.string().min(1)).min(1).max(8),
});

export const generatedRaceQuestionAnswerJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    answer: { type: "string", minLength: 1, maxLength: raceQuestionLimits.answerCharacters },
    sourceIds: { type: "array", minItems: 1, maxItems: 8, items: { type: "string", minLength: 1 } },
  },
  required: ["answer", "sourceIds"],
} as const;

export type RaceQuestionContext = z.infer<typeof raceQuestionContextSchema>;
export type RaceQuestionSource = z.infer<typeof raceQuestionSourceSchema>;
export type GeneratedRaceQuestionAnswer = z.infer<typeof generatedRaceQuestionAnswerSchema>;
export type F1Scope = z.infer<typeof f1ScopeSchema>;
export type F1QueryIntent = z.infer<typeof f1QueryIntentSchema>;
export type F1EntityReference = z.infer<typeof f1EntityReferenceSchema>;
export type F1ConversationTurn = z.infer<typeof f1ConversationTurnSchema>;
export type F1QueryPlan = z.infer<typeof f1QueryPlanSchema>;
