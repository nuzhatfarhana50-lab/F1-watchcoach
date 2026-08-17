-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "SessionType" AS ENUM ('PRACTICE_1', 'PRACTICE_2', 'PRACTICE_3', 'QUALIFYING', 'SPRINT_SHOOTOUT', 'SPRINT_QUALIFYING', 'SPRINT', 'RACE');

-- CreateEnum
CREATE TYPE "RaceStatus" AS ENUM ('SCHEDULED', 'LIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RaceMomentType" AS ENUM ('RACE_START', 'OVERTAKE', 'PIT_STOP', 'UNDERCUT', 'OVERCUT', 'STRATEGY_CHANGE', 'SAFETY_CAR', 'VIRTUAL_SAFETY_CAR', 'RED_FLAG', 'PENALTY', 'CRASH', 'CONTACT', 'MECHANICAL_FAILURE', 'TEAM_ORDER', 'RADIO_MESSAGE', 'TYRE_DEGRADATION', 'LOCK_UP', 'RESTART', 'TECHNICAL_ISSUE', 'DRIVER_MISTAKE', 'DRIVER_PERFORMANCE', 'CHAMPIONSHIP_EVENT', 'QUALIFYING_LAP');

-- CreateEnum
CREATE TYPE "RaceMomentStatus" AS ENUM ('CURATED', 'DETECTED', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ParticipantRole" AS ENUM ('PRIMARY', 'SECONDARY', 'AFFECTED');

-- CreateEnum
CREATE TYPE "SourceProvider" AS ENUM ('F1', 'FIA', 'OPENF1', 'JOLPICA', 'FASTF1', 'YOUTUBE', 'WIKIMEDIA', 'TEAM', 'DRIVER', 'OTHER');

-- CreateEnum
CREATE TYPE "SourceKind" AS ENUM ('OFFICIAL_REPORT', 'STRUCTURED_DATA', 'VIDEO', 'IMAGE', 'DOCUMENT', 'ARTICLE');

-- CreateEnum
CREATE TYPE "ExternalResourceType" AS ENUM ('SEASON', 'CIRCUIT', 'GRAND_PRIX', 'SESSION', 'RACE', 'DRIVER', 'TEAM', 'RACE_MOMENT');

-- CreateTable
CREATE TABLE "Season" (
    "id" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Circuit" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "locality" TEXT,
    "country" TEXT NOT NULL,
    "countryCode" CHAR(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Circuit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrandPrix" (
    "id" UUID NOT NULL,
    "seasonId" UUID NOT NULL,
    "circuitId" UUID NOT NULL,
    "round" INTEGER NOT NULL,
    "officialName" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "GrandPrix_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "grandPrixId" UUID NOT NULL,
    "type" "SessionType" NOT NULL,
    "name" TEXT NOT NULL,
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "endsAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Race" (
    "id" UUID NOT NULL,
    "grandPrixId" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "status" "RaceStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduledLaps" INTEGER,
    "actualLaps" INTEGER,
    "startedAt" TIMESTAMPTZ(3),
    "endedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Race_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Driver" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "givenName" TEXT NOT NULL,
    "familyName" TEXT NOT NULL,
    "code" TEXT,
    "permanentNumber" INTEGER,
    "nationality" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Driver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "canonicalName" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamSeasonIdentity" (
    "id" UUID NOT NULL,
    "teamId" UUID NOT NULL,
    "seasonId" UUID NOT NULL,
    "displayName" TEXT NOT NULL,
    "constructorName" TEXT NOT NULL,
    "nationality" TEXT,
    "validFrom" DATE NOT NULL,
    "validTo" DATE,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "TeamSeasonIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverTeamMembership" (
    "id" UUID NOT NULL,
    "driverId" UUID NOT NULL,
    "teamId" UUID NOT NULL,
    "seasonId" UUID NOT NULL,
    "carNumber" INTEGER,
    "validFrom" DATE NOT NULL,
    "validTo" DATE,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "DriverTeamMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RaceMoment" (
    "id" UUID NOT NULL,
    "raceId" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "RaceMomentType" NOT NULL,
    "status" "RaceMomentStatus" NOT NULL DEFAULT 'CURATED',
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "lapNumber" INTEGER,
    "occurredAt" TIMESTAMPTZ(3),
    "sequence" INTEGER NOT NULL,
    "importance" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "RaceMoment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RaceMomentDriver" (
    "raceMomentId" UUID NOT NULL,
    "driverId" UUID NOT NULL,
    "role" "ParticipantRole" NOT NULL DEFAULT 'PRIMARY',

    CONSTRAINT "RaceMomentDriver_pkey" PRIMARY KEY ("raceMomentId","driverId")
);

-- CreateTable
CREATE TABLE "RaceMomentTeam" (
    "raceMomentId" UUID NOT NULL,
    "teamId" UUID NOT NULL,
    "role" "ParticipantRole" NOT NULL DEFAULT 'PRIMARY',

    CONSTRAINT "RaceMomentTeam_pkey" PRIMARY KEY ("raceMomentId","teamId")
);

-- CreateTable
CREATE TABLE "Source" (
    "id" UUID NOT NULL,
    "provider" "SourceProvider" NOT NULL,
    "kind" "SourceKind" NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "publishedAt" TIMESTAMPTZ(3),
    "retrievedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RaceMomentSource" (
    "raceMomentId" UUID NOT NULL,
    "sourceId" UUID NOT NULL,

    CONSTRAINT "RaceMomentSource_pkey" PRIMARY KEY ("raceMomentId","sourceId")
);

-- CreateTable
CREATE TABLE "ExternalDataReference" (
    "id" UUID NOT NULL,
    "provider" "SourceProvider" NOT NULL,
    "resourceType" "ExternalResourceType" NOT NULL,
    "externalId" TEXT NOT NULL,
    "sourceId" UUID NOT NULL,
    "sourceUrl" TEXT,
    "fetchedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceTimestamp" TIMESTAMPTZ(3),
    "seasonId" UUID,
    "circuitId" UUID,
    "grandPrixId" UUID,
    "sessionId" UUID,
    "raceId" UUID,
    "driverId" UUID,
    "teamId" UUID,
    "raceMomentId" UUID,

    CONSTRAINT "ExternalDataReference_pkey" PRIMARY KEY ("id")
);

-- AddCheckConstraint
ALTER TABLE "GrandPrix"
ADD CONSTRAINT "GrandPrix_round_dates_check"
CHECK ("round" > 0 AND "endDate" >= "startDate");

-- AddCheckConstraint
ALTER TABLE "Session"
ADD CONSTRAINT "Session_time_range_check"
CHECK ("endsAt" IS NULL OR "endsAt" >= "startsAt");

-- AddCheckConstraint
ALTER TABLE "Race"
ADD CONSTRAINT "Race_laps_time_range_check"
CHECK (
    ("scheduledLaps" IS NULL OR "scheduledLaps" > 0)
    AND ("actualLaps" IS NULL OR "actualLaps" > 0)
    AND ("endedAt" IS NULL OR "startedAt" IS NULL OR "endedAt" >= "startedAt")
);

-- AddCheckConstraint
ALTER TABLE "Driver"
ADD CONSTRAINT "Driver_permanent_number_check"
CHECK ("permanentNumber" IS NULL OR "permanentNumber" BETWEEN 1 AND 99);

-- AddCheckConstraint
ALTER TABLE "TeamSeasonIdentity"
ADD CONSTRAINT "TeamSeasonIdentity_valid_range_check"
CHECK ("validTo" IS NULL OR "validTo" >= "validFrom");

-- AddCheckConstraint
ALTER TABLE "DriverTeamMembership"
ADD CONSTRAINT "DriverTeamMembership_valid_range_check"
CHECK (
    ("validTo" IS NULL OR "validTo" >= "validFrom")
    AND ("carNumber" IS NULL OR "carNumber" BETWEEN 1 AND 99)
);

-- AddCheckConstraint
ALTER TABLE "RaceMoment"
ADD CONSTRAINT "RaceMoment_bounds_check"
CHECK (
    "sequence" > 0
    AND "importance" BETWEEN 1 AND 5
    AND ("lapNumber" IS NULL OR "lapNumber" > 0)
);

-- AddCheckConstraint
ALTER TABLE "ExternalDataReference"
ADD CONSTRAINT "ExternalDataReference_single_target_check"
CHECK (
    num_nonnulls(
        "seasonId",
        "circuitId",
        "grandPrixId",
        "sessionId",
        "raceId",
        "driverId",
        "teamId",
        "raceMomentId"
    ) = 1
    AND CASE "resourceType"
        WHEN 'SEASON' THEN "seasonId" IS NOT NULL
        WHEN 'CIRCUIT' THEN "circuitId" IS NOT NULL
        WHEN 'GRAND_PRIX' THEN "grandPrixId" IS NOT NULL
        WHEN 'SESSION' THEN "sessionId" IS NOT NULL
        WHEN 'RACE' THEN "raceId" IS NOT NULL
        WHEN 'DRIVER' THEN "driverId" IS NOT NULL
        WHEN 'TEAM' THEN "teamId" IS NOT NULL
        WHEN 'RACE_MOMENT' THEN "raceMomentId" IS NOT NULL
    END
);

-- CreateIndex
CREATE UNIQUE INDEX "Season_year_key" ON "Season"("year");

-- CreateIndex
CREATE UNIQUE INDEX "Circuit_slug_key" ON "Circuit"("slug");

-- CreateIndex
CREATE INDEX "GrandPrix_circuitId_idx" ON "GrandPrix"("circuitId");

-- CreateIndex
CREATE UNIQUE INDEX "GrandPrix_seasonId_round_key" ON "GrandPrix"("seasonId", "round");

-- CreateIndex
CREATE UNIQUE INDEX "Session_grandPrixId_type_key" ON "Session"("grandPrixId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Race_grandPrixId_key" ON "Race"("grandPrixId");

-- CreateIndex
CREATE UNIQUE INDEX "Race_sessionId_key" ON "Race"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_slug_key" ON "Driver"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Team_slug_key" ON "Team"("slug");

-- CreateIndex
CREATE INDEX "TeamSeasonIdentity_seasonId_idx" ON "TeamSeasonIdentity"("seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamSeasonIdentity_teamId_seasonId_validFrom_key" ON "TeamSeasonIdentity"("teamId", "seasonId", "validFrom");

-- CreateIndex
CREATE INDEX "DriverTeamMembership_teamId_seasonId_idx" ON "DriverTeamMembership"("teamId", "seasonId");

-- CreateIndex
CREATE INDEX "DriverTeamMembership_seasonId_idx" ON "DriverTeamMembership"("seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "DriverTeamMembership_driverId_teamId_seasonId_validFrom_key" ON "DriverTeamMembership"("driverId", "teamId", "seasonId", "validFrom");

-- CreateIndex
CREATE INDEX "RaceMoment_sessionId_lapNumber_idx" ON "RaceMoment"("sessionId", "lapNumber");

-- CreateIndex
CREATE INDEX "RaceMoment_type_status_idx" ON "RaceMoment"("type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "RaceMoment_raceId_slug_key" ON "RaceMoment"("raceId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "RaceMoment_raceId_sequence_key" ON "RaceMoment"("raceId", "sequence");

-- CreateIndex
CREATE INDEX "RaceMomentDriver_driverId_idx" ON "RaceMomentDriver"("driverId");

-- CreateIndex
CREATE INDEX "RaceMomentTeam_teamId_idx" ON "RaceMomentTeam"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "Source_url_key" ON "Source"("url");

-- CreateIndex
CREATE INDEX "RaceMomentSource_sourceId_idx" ON "RaceMomentSource"("sourceId");

-- CreateIndex
CREATE INDEX "ExternalDataReference_sourceId_idx" ON "ExternalDataReference"("sourceId");

-- CreateIndex
CREATE INDEX "ExternalDataReference_seasonId_idx" ON "ExternalDataReference"("seasonId");

-- CreateIndex
CREATE INDEX "ExternalDataReference_circuitId_idx" ON "ExternalDataReference"("circuitId");

-- CreateIndex
CREATE INDEX "ExternalDataReference_grandPrixId_idx" ON "ExternalDataReference"("grandPrixId");

-- CreateIndex
CREATE INDEX "ExternalDataReference_sessionId_idx" ON "ExternalDataReference"("sessionId");

-- CreateIndex
CREATE INDEX "ExternalDataReference_raceId_idx" ON "ExternalDataReference"("raceId");

-- CreateIndex
CREATE INDEX "ExternalDataReference_driverId_idx" ON "ExternalDataReference"("driverId");

-- CreateIndex
CREATE INDEX "ExternalDataReference_teamId_idx" ON "ExternalDataReference"("teamId");

-- CreateIndex
CREATE INDEX "ExternalDataReference_raceMomentId_idx" ON "ExternalDataReference"("raceMomentId");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalDataReference_provider_resourceType_externalId_key" ON "ExternalDataReference"("provider", "resourceType", "externalId");

-- AddForeignKey
ALTER TABLE "GrandPrix" ADD CONSTRAINT "GrandPrix_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrandPrix" ADD CONSTRAINT "GrandPrix_circuitId_fkey" FOREIGN KEY ("circuitId") REFERENCES "Circuit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_grandPrixId_fkey" FOREIGN KEY ("grandPrixId") REFERENCES "GrandPrix"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Race" ADD CONSTRAINT "Race_grandPrixId_fkey" FOREIGN KEY ("grandPrixId") REFERENCES "GrandPrix"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Race" ADD CONSTRAINT "Race_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamSeasonIdentity" ADD CONSTRAINT "TeamSeasonIdentity_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamSeasonIdentity" ADD CONSTRAINT "TeamSeasonIdentity_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverTeamMembership" ADD CONSTRAINT "DriverTeamMembership_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverTeamMembership" ADD CONSTRAINT "DriverTeamMembership_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverTeamMembership" ADD CONSTRAINT "DriverTeamMembership_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaceMoment" ADD CONSTRAINT "RaceMoment_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "Race"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaceMoment" ADD CONSTRAINT "RaceMoment_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaceMomentDriver" ADD CONSTRAINT "RaceMomentDriver_raceMomentId_fkey" FOREIGN KEY ("raceMomentId") REFERENCES "RaceMoment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaceMomentDriver" ADD CONSTRAINT "RaceMomentDriver_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaceMomentTeam" ADD CONSTRAINT "RaceMomentTeam_raceMomentId_fkey" FOREIGN KEY ("raceMomentId") REFERENCES "RaceMoment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaceMomentTeam" ADD CONSTRAINT "RaceMomentTeam_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaceMomentSource" ADD CONSTRAINT "RaceMomentSource_raceMomentId_fkey" FOREIGN KEY ("raceMomentId") REFERENCES "RaceMoment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaceMomentSource" ADD CONSTRAINT "RaceMomentSource_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalDataReference" ADD CONSTRAINT "ExternalDataReference_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalDataReference" ADD CONSTRAINT "ExternalDataReference_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalDataReference" ADD CONSTRAINT "ExternalDataReference_circuitId_fkey" FOREIGN KEY ("circuitId") REFERENCES "Circuit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalDataReference" ADD CONSTRAINT "ExternalDataReference_grandPrixId_fkey" FOREIGN KEY ("grandPrixId") REFERENCES "GrandPrix"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalDataReference" ADD CONSTRAINT "ExternalDataReference_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalDataReference" ADD CONSTRAINT "ExternalDataReference_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "Race"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalDataReference" ADD CONSTRAINT "ExternalDataReference_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalDataReference" ADD CONSTRAINT "ExternalDataReference_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalDataReference" ADD CONSTRAINT "ExternalDataReference_raceMomentId_fkey" FOREIGN KEY ("raceMomentId") REFERENCES "RaceMoment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
