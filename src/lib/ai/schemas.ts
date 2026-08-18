import { z } from "zod";

const uuidSchema = z.string().uuid();

export const groundedExplanationSchema = z.object({
  summary: z.string().min(1).max(400),
  whatHappened: z.string().min(1).max(800),
  whyItHappened: z.string().min(1).max(800),
  whyItMatters: z.string().min(1).max(800),
  watchNext: z.string().min(1).max(800),
  conceptIds: z.array(uuidSchema).min(1),
  relatedMomentIds: z.array(uuidSchema).max(5),
  citedSourceIds: z.array(uuidSchema).min(1),
});

export type GroundedExplanation = z.infer<typeof groundedExplanationSchema>;

export const groundingContextSchema = z.object({
  momentId: uuidSchema,
  title: z.string().min(1),
  summary: z.string().min(1),
  evidence: z.array(z.object({ id: uuidSchema, type: z.string().min(1), detail: z.string().min(1), sourceIds: z.array(uuidSchema).min(1) })).min(1),
  concepts: z.array(z.object({ id: uuidSchema, name: z.string().min(1), definition: z.string().min(1) })).min(1),
  candidateMoments: z.array(z.object({ id: uuidSchema, title: z.string().min(1), reason: z.string().min(1) })).max(10),
  sources: z.array(z.object({ id: uuidSchema, title: z.string().min(1), url: z.string().url() })).min(1),
  curatedFallback: groundedExplanationSchema,
});

export type GroundingContext = z.infer<typeof groundingContextSchema>;

export const conceptClassificationSchema = z.object({
  conceptIds: z.array(uuidSchema).min(1).max(5),
  confidence: z.number().min(0).max(1),
  rationale: z.string().min(1).max(500),
});

export const connectionDiscoverySchema = z.object({
  connections: z.array(z.object({
    momentId: uuidSchema,
    reason: z.enum(["sameConcept", "sameDriver", "sameCircuit", "similarStrategy", "historicalParallel", "championshipContext", "technicalParallel", "teamHistory"]),
    explanation: z.string().min(1).max(600),
  })).max(5),
});

export const conceptClassificationJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["conceptIds", "confidence", "rationale"],
  properties: {
    conceptIds: { type: "array", minItems: 1, maxItems: 5, items: { type: "string", format: "uuid" } },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    rationale: { type: "string" },
  },
} as const;

export const connectionDiscoveryJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["connections"],
  properties: {
    connections: {
      type: "array",
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["momentId", "reason", "explanation"],
        properties: {
          momentId: { type: "string", format: "uuid" },
          reason: { type: "string", enum: ["sameConcept", "sameDriver", "sameCircuit", "similarStrategy", "historicalParallel", "championshipContext", "technicalParallel", "teamHistory"] },
          explanation: { type: "string" },
        },
      },
    },
  },
} as const;

export const groundedExplanationJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "whatHappened", "whyItHappened", "whyItMatters", "watchNext", "conceptIds", "relatedMomentIds", "citedSourceIds"],
  properties: {
    summary: { type: "string" },
    whatHappened: { type: "string" },
    whyItHappened: { type: "string" },
    whyItMatters: { type: "string" },
    watchNext: { type: "string" },
    conceptIds: { type: "array", items: { type: "string", format: "uuid" } },
    relatedMomentIds: { type: "array", items: { type: "string", format: "uuid" } },
    citedSourceIds: { type: "array", items: { type: "string", format: "uuid" } },
  },
} as const;
