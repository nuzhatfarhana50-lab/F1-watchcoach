import type { z } from "zod";

import type {
  circuitSchema,
  conceptReferenceSchema,
  driverSchema,
  driverTeamMembershipSchema,
  externalDataReferenceSchema,
  explanationSchema,
  championshipStandingSchema,
  grandPrixSchema,
  mediaReferenceSchema,
  lapSchema,
  momentConnectionSchema,
  raceEvidenceSchema,
  raceFixtureCollectionSchema,
  raceMomentSchema,
  pitStopSchema,
  positionRecordSchema,
  raceControlEventSchema,
  resultSchema,
  raceSchema,
  seasonSchema,
  sessionSchema,
  sourceSchema,
  teamSchema,
  teamSeasonIdentitySchema,
  tyreStintSchema,
} from "./schemas";

export type Source = z.infer<typeof sourceSchema>;
export type ExternalDataReference = z.infer<typeof externalDataReferenceSchema>;
export type Season = z.infer<typeof seasonSchema>;
export type Circuit = z.infer<typeof circuitSchema>;
export type GrandPrix = z.infer<typeof grandPrixSchema>;
export type Session = z.infer<typeof sessionSchema>;
export type Race = z.infer<typeof raceSchema>;
export type Driver = z.infer<typeof driverSchema>;
export type Team = z.infer<typeof teamSchema>;
export type TeamSeasonIdentity = z.infer<typeof teamSeasonIdentitySchema>;
export type DriverTeamMembership = z.infer<typeof driverTeamMembershipSchema>;
export type Lap = z.infer<typeof lapSchema>;
export type PositionRecord = z.infer<typeof positionRecordSchema>;
export type PitStop = z.infer<typeof pitStopSchema>;
export type TyreStint = z.infer<typeof tyreStintSchema>;
export type RaceControlEvent = z.infer<typeof raceControlEventSchema>;
export type Result = z.infer<typeof resultSchema>;
export type ChampionshipStanding = z.infer<typeof championshipStandingSchema>;
export type RaceEvidence = z.infer<typeof raceEvidenceSchema>;
export type ConceptReference = z.infer<typeof conceptReferenceSchema>;
export type Explanation = z.infer<typeof explanationSchema>;
export type MomentConnection = z.infer<typeof momentConnectionSchema>;
export type MediaReference = z.infer<typeof mediaReferenceSchema>;
export type RaceMoment = z.infer<typeof raceMomentSchema>;
export type RaceFixtureCollection = z.infer<typeof raceFixtureCollectionSchema>;
