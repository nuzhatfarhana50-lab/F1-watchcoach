import { z } from "zod";

const idSchema = z.string().uuid();
const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const dateTimeSchema = z.string().datetime({ offset: true });
const sourceIdsSchema = z.array(idSchema).min(1);

export const sourceProviderSchema = z.enum([
  "f1",
  "fia",
  "openf1",
  "jolpica",
  "fastf1",
  "youtube",
  "wikimedia",
  "team",
  "driver",
  "other",
]);

export const sourceSchema = z.object({
  id: idSchema,
  provider: sourceProviderSchema,
  kind: z.enum([
    "officialReport",
    "structuredData",
    "video",
    "image",
    "document",
    "article",
  ]),
  title: z.string().min(1),
  url: z.string().url(),
  publishedAt: dateTimeSchema.optional(),
  retrievedAt: dateTimeSchema,
});

const externalResourceTypeSchema = z.enum([
  "season",
  "circuit",
  "grandPrix",
  "session",
  "race",
  "driver",
  "team",
  "raceMoment",
  "lap",
  "position",
  "pitStop",
  "tyreStint",
  "raceControlEvent",
  "result",
  "championshipStanding",
]);

export const externalDataReferenceSchema = z.object({
  id: idSchema,
  provider: sourceProviderSchema,
  resourceType: externalResourceTypeSchema,
  externalId: z.string().min(1),
  sourceId: idSchema,
  sourceUrl: z.string().url().optional(),
  fetchedAt: dateTimeSchema,
  sourceTimestamp: dateTimeSchema.optional(),
  entityId: idSchema,
});

export const seasonSchema = z.object({
  id: idSchema,
  year: z.number().int().min(1950).max(2200),
  sourceIds: sourceIdsSchema,
});

export const circuitSchema = z.object({
  id: idSchema,
  slug: slugSchema,
  name: z.string().min(1),
  locality: z.string().min(1).optional(),
  country: z.string().min(1),
  countryCode: z.string().length(3),
  sourceIds: sourceIdsSchema,
});

export const grandPrixSchema = z.object({
  id: idSchema,
  seasonId: idSchema,
  circuitId: idSchema,
  round: z.number().int().positive(),
  officialName: z.string().min(1),
  shortName: z.string().min(1),
  startDate: dateSchema,
  endDate: dateSchema,
  sourceIds: sourceIdsSchema,
});

export const sessionSchema = z.object({
  id: idSchema,
  grandPrixId: idSchema,
  type: z.enum([
    "practice1",
    "practice2",
    "practice3",
    "qualifying",
    "sprintShootout",
    "sprintQualifying",
    "sprint",
    "race",
  ]),
  name: z.string().min(1),
  startsAt: dateTimeSchema,
  endsAt: dateTimeSchema.optional(),
  sourceIds: sourceIdsSchema,
});

export const raceSchema = z.object({
  id: idSchema,
  grandPrixId: idSchema,
  sessionId: idSchema,
  status: z.enum(["scheduled", "live", "completed", "cancelled"]),
  scheduledLaps: z.number().int().positive().optional(),
  actualLaps: z.number().int().positive().optional(),
  startedAt: dateTimeSchema.optional(),
  endedAt: dateTimeSchema.optional(),
  sourceIds: sourceIdsSchema,
});

export const driverSchema = z.object({
  id: idSchema,
  slug: slugSchema,
  givenName: z.string().min(1),
  familyName: z.string().min(1),
  code: z.string().min(2).max(4).optional(),
  permanentNumber: z.number().int().min(1).max(99).optional(),
  nationality: z.string().min(1).optional(),
  sourceIds: sourceIdsSchema,
});

export const teamSchema = z.object({
  id: idSchema,
  slug: slugSchema,
  canonicalName: z.string().min(1),
  sourceIds: sourceIdsSchema,
});

export const teamSeasonIdentitySchema = z.object({
  id: idSchema,
  teamId: idSchema,
  seasonId: idSchema,
  displayName: z.string().min(1),
  constructorName: z.string().min(1),
  nationality: z.string().min(1).optional(),
  validFrom: dateSchema,
  validTo: dateSchema.optional(),
  sourceIds: sourceIdsSchema,
});

export const driverTeamMembershipSchema = z.object({
  id: idSchema,
  driverId: idSchema,
  teamId: idSchema,
  seasonId: idSchema,
  carNumber: z.number().int().min(1).max(99).optional(),
  validFrom: dateSchema,
  validTo: dateSchema.optional(),
  sourceIds: sourceIdsSchema,
});

const primarySourceSchema = z.object({
  id: idSchema,
  sourceId: idSchema,
});

export const lapSchema = primarySourceSchema.extend({
  sessionId: idSchema,
  driverId: idSchema,
  number: z.number().int().positive(),
  startedAt: dateTimeSchema.optional(),
  durationMs: z.number().int().positive().optional(),
  isPersonalBest: z.boolean().default(false),
});

export const positionRecordSchema = primarySourceSchema.extend({
  sessionId: idSchema,
  driverId: idSchema,
  sequence: z.number().int().positive(),
  recordedAt: dateTimeSchema.optional(),
  lapNumber: z.number().int().positive().optional(),
  position: z.number().int().positive(),
});

export const pitStopSchema = primarySourceSchema.extend({
  sessionId: idSchema,
  driverId: idSchema,
  stopNumber: z.number().int().positive(),
  lapNumber: z.number().int().positive(),
  occurredAt: dateTimeSchema.optional(),
  stationaryDurationMs: z.number().int().nonnegative().optional(),
  pitLaneDurationMs: z.number().int().nonnegative().optional(),
});

export const tyreStintSchema = primarySourceSchema.extend({
  sessionId: idSchema,
  driverId: idSchema,
  stintNumber: z.number().int().positive(),
  startLap: z.number().int().positive(),
  endLap: z.number().int().positive().optional(),
  compound: z.enum(["soft", "medium", "hard", "intermediate", "wet", "unknown"]),
  tyreAgeAtStart: z.number().int().nonnegative().default(0),
});

export const raceControlEventSchema = primarySourceSchema.extend({
  sessionId: idSchema,
  sequence: z.number().int().positive(),
  occurredAt: dateTimeSchema.optional(),
  lapNumber: z.number().int().positive().optional(),
  category: z.enum(["safetyCar", "virtualSafetyCar", "redFlag", "penalty", "flag", "weather", "other"]),
  message: z.string().min(1),
});

export const resultSchema = primarySourceSchema.extend({
  sessionId: idSchema,
  driverId: idSchema,
  teamId: idSchema,
  classification: z.number().int().positive().optional(),
  gridPosition: z.number().int().nonnegative().optional(),
  lapsCompleted: z.number().int().nonnegative(),
  points: z.number().nonnegative(),
  status: z.string().min(1),
  fastestLapRank: z.number().int().positive().optional(),
});

export const championshipStandingSchema = primarySourceSchema.extend({
  seasonId: idSchema,
  afterGrandPrixId: idSchema,
  kind: z.enum(["driver", "constructor"]),
  driverId: idSchema.optional(),
  teamId: idSchema.optional(),
  position: z.number().int().positive(),
  points: z.number().nonnegative(),
  wins: z.number().int().nonnegative(),
});

const evidenceBaseSchema = z.object({
  id: idSchema,
  sourceIds: sourceIdsSchema,
});

export const raceEvidenceSchema = z.discriminatedUnion("type", [
  evidenceBaseSchema.extend({
    type: z.literal("pitStop"),
    lap: z.number().int().positive(),
    driverId: idSchema,
    tyreCompound: z.enum(["soft", "medium", "hard", "intermediate", "wet"]),
    stationaryDurationSeconds: z.number().positive().optional(),
    pitLaneDurationSeconds: z.number().positive().optional(),
  }),
  evidenceBaseSchema.extend({
    type: z.literal("tyreStint"),
    driverId: idSchema,
    startLap: z.number().int().positive(),
    endLap: z.number().int().positive(),
    tyreCompound: z.enum(["soft", "medium", "hard", "intermediate", "wet"]),
  }),
  evidenceBaseSchema.extend({
    type: z.literal("position"),
    lap: z.number().int().positive(),
    driverId: idSchema,
    position: z.number().int().positive(),
  }),
  evidenceBaseSchema.extend({
    type: z.literal("raceControl"),
    lap: z.number().int().positive().optional(),
    category: z.enum(["safetyCar", "virtualSafetyCar", "redFlag", "penalty", "other"]),
    message: z.string().min(1),
  }),
]);

export const conceptReferenceSchema = z.object({
  id: idSchema,
  slug: slugSchema,
  name: z.string().min(1),
  category: z.enum(["strategy", "tyres", "racing", "engineering", "regulations"]),
  definition: z.string().min(1),
  sourceIds: sourceIdsSchema,
});

export const explanationSchema = z.object({
  id: idSchema,
  slug: slugSchema,
  whatHappened: z.string().min(1),
  whyItHappened: z.string().min(1),
  whyItMatters: z.string().min(1),
  watchNext: z.string().min(1),
  conceptIds: z.array(idSchema).min(1),
  sourceIds: sourceIdsSchema,
});

export const momentConnectionSchema = z.object({
  id: idSchema,
  targetMomentId: idSchema,
  reason: z.enum([
    "sameConcept",
    "sameDriver",
    "sameCircuit",
    "similarStrategy",
    "historicalParallel",
    "championshipContext",
    "technicalParallel",
    "teamHistory",
  ]),
  explanation: z.string().min(1),
  sourceIds: sourceIdsSchema,
});

export const mediaReferenceSchema = z.object({
  id: idSchema,
  provider: z.enum(["officialF1", "youtube", "wikimedia", "fia", "team", "driver"]),
  providerId: z.string().min(1).optional(),
  kind: z.enum(["video", "image", "document"]),
  title: z.string().min(1),
  url: z.string().url(),
  embedUrl: z.string().url().optional(),
  startTimestampSeconds: z.number().int().nonnegative().optional(),
  license: z.string().min(1).optional(),
  attribution: z.string().min(1),
  sourceIds: sourceIdsSchema,
});

const participantSchema = z.object({
  entityId: idSchema,
  role: z.enum(["primary", "secondary", "affected"]),
});

export const raceMomentSchema = z.object({
  id: idSchema,
  raceId: idSchema,
  sessionId: idSchema,
  slug: slugSchema,
  type: z.enum([
    "raceStart",
    "overtake",
    "pitStop",
    "undercut",
    "overcut",
    "strategyChange",
    "safetyCar",
    "virtualSafetyCar",
    "redFlag",
    "penalty",
    "crash",
    "contact",
    "mechanicalFailure",
    "teamOrder",
    "radioMessage",
    "tyreDegradation",
    "lockUp",
    "restart",
    "technicalIssue",
    "driverMistake",
    "driverPerformance",
    "championshipEvent",
    "qualifyingLap",
  ]),
  status: z.enum(["curated", "detected", "verified", "rejected"]),
  title: z.string().min(1),
  summary: z.string().min(1),
  lapNumber: z.number().int().positive().optional(),
  occurredAt: dateTimeSchema.optional(),
  sequence: z.number().int().positive(),
  importance: z.number().int().min(1).max(5),
  drivers: z.array(participantSchema).min(1),
  teams: z.array(participantSchema).min(1),
  evidence: z.array(raceEvidenceSchema).min(1),
  concepts: z.array(conceptReferenceSchema).min(1),
  explanation: explanationSchema,
  connections: z.array(momentConnectionSchema),
  media: z.array(mediaReferenceSchema),
  sourceIds: sourceIdsSchema,
});

export const raceFixtureCollectionSchema = z.object({
  schemaVersion: z.literal(1),
  sources: z.array(sourceSchema).min(1),
  externalReferences: z.array(externalDataReferenceSchema).min(1),
  seasons: z.array(seasonSchema).min(1),
  circuits: z.array(circuitSchema).min(1),
  grandsPrix: z.array(grandPrixSchema).min(1),
  sessions: z.array(sessionSchema).min(1),
  races: z.array(raceSchema).min(1),
  drivers: z.array(driverSchema).min(1),
  teams: z.array(teamSchema).min(1),
  teamSeasonIdentities: z.array(teamSeasonIdentitySchema).min(1),
  driverTeamMemberships: z.array(driverTeamMembershipSchema).min(1),
  laps: z.array(lapSchema).min(1),
  positions: z.array(positionRecordSchema).min(1),
  pitStops: z.array(pitStopSchema).min(1),
  tyreStints: z.array(tyreStintSchema).min(1),
  raceControlEvents: z.array(raceControlEventSchema),
  results: z.array(resultSchema).min(1),
  championshipStandings: z.array(championshipStandingSchema),
  moments: z.array(raceMomentSchema).min(1),
});
