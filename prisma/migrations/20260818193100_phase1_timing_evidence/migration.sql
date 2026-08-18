-- AlterTable
ALTER TABLE "ExternalDataReference" ADD COLUMN     "championshipStandingId" UUID,
ADD COLUMN     "lapId" UUID,
ADD COLUMN     "pitStopId" UUID,
ADD COLUMN     "positionId" UUID,
ADD COLUMN     "raceControlEventId" UUID,
ADD COLUMN     "resultId" UUID,
ADD COLUMN     "tyreStintId" UUID;

-- Replace the core target check so it covers the newly approved evidence targets.
ALTER TABLE "ExternalDataReference"
DROP CONSTRAINT "ExternalDataReference_single_target_check";

-- CreateTable
CREATE TABLE "Lap" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "driverId" UUID NOT NULL,
    "sourceId" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "startedAt" TIMESTAMPTZ(3),
    "durationMs" INTEGER,
    "isPersonalBest" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Lap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Position" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "driverId" UUID NOT NULL,
    "sourceId" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "recordedAt" TIMESTAMPTZ(3),
    "lapNumber" INTEGER,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PitStop" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "driverId" UUID NOT NULL,
    "sourceId" UUID NOT NULL,
    "stopNumber" INTEGER NOT NULL,
    "lapNumber" INTEGER NOT NULL,
    "occurredAt" TIMESTAMPTZ(3),
    "stationaryDurationMs" INTEGER,
    "pitLaneDurationMs" INTEGER,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "PitStop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TyreStint" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "driverId" UUID NOT NULL,
    "sourceId" UUID NOT NULL,
    "stintNumber" INTEGER NOT NULL,
    "startLap" INTEGER NOT NULL,
    "endLap" INTEGER,
    "compound" "TyreCompound" NOT NULL,
    "tyreAgeAtStart" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "TyreStint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RaceControlEvent" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "sourceId" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "occurredAt" TIMESTAMPTZ(3),
    "lapNumber" INTEGER,
    "category" "RaceControlCategory" NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "RaceControlEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Result" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "driverId" UUID NOT NULL,
    "teamId" UUID NOT NULL,
    "sourceId" UUID NOT NULL,
    "classification" INTEGER,
    "gridPosition" INTEGER,
    "lapsCompleted" INTEGER NOT NULL,
    "points" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "fastestLapRank" INTEGER,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Result_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChampionshipStanding" (
    "id" UUID NOT NULL,
    "seasonId" UUID NOT NULL,
    "afterGrandPrixId" UUID NOT NULL,
    "driverId" UUID,
    "teamId" UUID,
    "sourceId" UUID NOT NULL,
    "kind" "StandingKind" NOT NULL,
    "position" INTEGER NOT NULL,
    "points" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ChampionshipStanding_pkey" PRIMARY KEY ("id")
);

-- AddCheckConstraint
ALTER TABLE "Lap"
ADD CONSTRAINT "Lap_bounds_check"
CHECK (
    "number" > 0
    AND ("durationMs" IS NULL OR "durationMs" > 0)
);

-- AddCheckConstraint
ALTER TABLE "Position"
ADD CONSTRAINT "Position_bounds_check"
CHECK (
    "sequence" > 0
    AND "position" > 0
    AND ("lapNumber" IS NULL OR "lapNumber" > 0)
);

-- AddCheckConstraint
ALTER TABLE "PitStop"
ADD CONSTRAINT "PitStop_bounds_check"
CHECK (
    "stopNumber" > 0
    AND "lapNumber" > 0
    AND ("stationaryDurationMs" IS NULL OR "stationaryDurationMs" >= 0)
    AND ("pitLaneDurationMs" IS NULL OR "pitLaneDurationMs" >= 0)
);

-- AddCheckConstraint
ALTER TABLE "TyreStint"
ADD CONSTRAINT "TyreStint_bounds_check"
CHECK (
    "stintNumber" > 0
    AND "startLap" > 0
    AND ("endLap" IS NULL OR "endLap" >= "startLap")
    AND "tyreAgeAtStart" >= 0
);

-- AddCheckConstraint
ALTER TABLE "RaceControlEvent"
ADD CONSTRAINT "RaceControlEvent_bounds_check"
CHECK (
    "sequence" > 0
    AND ("lapNumber" IS NULL OR "lapNumber" > 0)
);

-- AddCheckConstraint
ALTER TABLE "Result"
ADD CONSTRAINT "Result_bounds_check"
CHECK (
    ("classification" IS NULL OR "classification" > 0)
    AND ("gridPosition" IS NULL OR "gridPosition" >= 0)
    AND "lapsCompleted" >= 0
    AND "points" >= 0
    AND ("fastestLapRank" IS NULL OR "fastestLapRank" > 0)
);

-- AddCheckConstraint
ALTER TABLE "ChampionshipStanding"
ADD CONSTRAINT "ChampionshipStanding_target_bounds_check"
CHECK (
    "position" > 0
    AND "points" >= 0
    AND "wins" >= 0
    AND num_nonnulls("driverId", "teamId") = 1
    AND CASE "kind"
        WHEN 'DRIVER' THEN "driverId" IS NOT NULL
        WHEN 'CONSTRUCTOR' THEN "teamId" IS NOT NULL
    END
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
        "raceMomentId",
        "lapId",
        "positionId",
        "pitStopId",
        "tyreStintId",
        "raceControlEventId",
        "resultId",
        "championshipStandingId"
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
        WHEN 'LAP' THEN "lapId" IS NOT NULL
        WHEN 'POSITION' THEN "positionId" IS NOT NULL
        WHEN 'PIT_STOP' THEN "pitStopId" IS NOT NULL
        WHEN 'TYRE_STINT' THEN "tyreStintId" IS NOT NULL
        WHEN 'RACE_CONTROL_EVENT' THEN "raceControlEventId" IS NOT NULL
        WHEN 'RESULT' THEN "resultId" IS NOT NULL
        WHEN 'CHAMPIONSHIP_STANDING' THEN "championshipStandingId" IS NOT NULL
    END
);

-- CreateIndex
CREATE INDEX "Lap_driverId_number_idx" ON "Lap"("driverId", "number");

-- CreateIndex
CREATE INDEX "Lap_sourceId_idx" ON "Lap"("sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "Lap_sessionId_driverId_number_key" ON "Lap"("sessionId", "driverId", "number");

-- CreateIndex
CREATE INDEX "Position_sessionId_recordedAt_idx" ON "Position"("sessionId", "recordedAt");

-- CreateIndex
CREATE INDEX "Position_driverId_lapNumber_idx" ON "Position"("driverId", "lapNumber");

-- CreateIndex
CREATE INDEX "Position_sourceId_idx" ON "Position"("sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "Position_sessionId_driverId_sequence_key" ON "Position"("sessionId", "driverId", "sequence");

-- CreateIndex
CREATE INDEX "PitStop_sessionId_lapNumber_idx" ON "PitStop"("sessionId", "lapNumber");

-- CreateIndex
CREATE INDEX "PitStop_sourceId_idx" ON "PitStop"("sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "PitStop_sessionId_driverId_stopNumber_key" ON "PitStop"("sessionId", "driverId", "stopNumber");

-- CreateIndex
CREATE INDEX "TyreStint_sessionId_startLap_idx" ON "TyreStint"("sessionId", "startLap");

-- CreateIndex
CREATE INDEX "TyreStint_sourceId_idx" ON "TyreStint"("sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "TyreStint_sessionId_driverId_stintNumber_key" ON "TyreStint"("sessionId", "driverId", "stintNumber");

-- CreateIndex
CREATE INDEX "RaceControlEvent_sessionId_lapNumber_idx" ON "RaceControlEvent"("sessionId", "lapNumber");

-- CreateIndex
CREATE INDEX "RaceControlEvent_sourceId_idx" ON "RaceControlEvent"("sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "RaceControlEvent_sessionId_sequence_key" ON "RaceControlEvent"("sessionId", "sequence");

-- CreateIndex
CREATE INDEX "Result_teamId_sessionId_idx" ON "Result"("teamId", "sessionId");

-- CreateIndex
CREATE INDEX "Result_sourceId_idx" ON "Result"("sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "Result_sessionId_driverId_key" ON "Result"("sessionId", "driverId");

-- CreateIndex
CREATE UNIQUE INDEX "Result_sessionId_classification_key" ON "Result"("sessionId", "classification");

-- CreateIndex
CREATE INDEX "ChampionshipStanding_seasonId_afterGrandPrixId_kind_positio_idx" ON "ChampionshipStanding"("seasonId", "afterGrandPrixId", "kind", "position");

-- CreateIndex
CREATE INDEX "ChampionshipStanding_sourceId_idx" ON "ChampionshipStanding"("sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "ChampionshipStanding_seasonId_afterGrandPrixId_driverId_key" ON "ChampionshipStanding"("seasonId", "afterGrandPrixId", "driverId");

-- CreateIndex
CREATE UNIQUE INDEX "ChampionshipStanding_seasonId_afterGrandPrixId_teamId_key" ON "ChampionshipStanding"("seasonId", "afterGrandPrixId", "teamId");

-- CreateIndex
CREATE INDEX "ExternalDataReference_lapId_idx" ON "ExternalDataReference"("lapId");

-- CreateIndex
CREATE INDEX "ExternalDataReference_positionId_idx" ON "ExternalDataReference"("positionId");

-- CreateIndex
CREATE INDEX "ExternalDataReference_pitStopId_idx" ON "ExternalDataReference"("pitStopId");

-- CreateIndex
CREATE INDEX "ExternalDataReference_tyreStintId_idx" ON "ExternalDataReference"("tyreStintId");

-- CreateIndex
CREATE INDEX "ExternalDataReference_raceControlEventId_idx" ON "ExternalDataReference"("raceControlEventId");

-- CreateIndex
CREATE INDEX "ExternalDataReference_resultId_idx" ON "ExternalDataReference"("resultId");

-- CreateIndex
CREATE INDEX "ExternalDataReference_championshipStandingId_idx" ON "ExternalDataReference"("championshipStandingId");

-- AddForeignKey
ALTER TABLE "Lap" ADD CONSTRAINT "Lap_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lap" ADD CONSTRAINT "Lap_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lap" ADD CONSTRAINT "Lap_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PitStop" ADD CONSTRAINT "PitStop_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PitStop" ADD CONSTRAINT "PitStop_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PitStop" ADD CONSTRAINT "PitStop_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TyreStint" ADD CONSTRAINT "TyreStint_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TyreStint" ADD CONSTRAINT "TyreStint_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TyreStint" ADD CONSTRAINT "TyreStint_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaceControlEvent" ADD CONSTRAINT "RaceControlEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaceControlEvent" ADD CONSTRAINT "RaceControlEvent_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChampionshipStanding" ADD CONSTRAINT "ChampionshipStanding_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChampionshipStanding" ADD CONSTRAINT "ChampionshipStanding_afterGrandPrixId_fkey" FOREIGN KEY ("afterGrandPrixId") REFERENCES "GrandPrix"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChampionshipStanding" ADD CONSTRAINT "ChampionshipStanding_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChampionshipStanding" ADD CONSTRAINT "ChampionshipStanding_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChampionshipStanding" ADD CONSTRAINT "ChampionshipStanding_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalDataReference" ADD CONSTRAINT "ExternalDataReference_lapId_fkey" FOREIGN KEY ("lapId") REFERENCES "Lap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalDataReference" ADD CONSTRAINT "ExternalDataReference_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalDataReference" ADD CONSTRAINT "ExternalDataReference_pitStopId_fkey" FOREIGN KEY ("pitStopId") REFERENCES "PitStop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalDataReference" ADD CONSTRAINT "ExternalDataReference_tyreStintId_fkey" FOREIGN KEY ("tyreStintId") REFERENCES "TyreStint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalDataReference" ADD CONSTRAINT "ExternalDataReference_raceControlEventId_fkey" FOREIGN KEY ("raceControlEventId") REFERENCES "RaceControlEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalDataReference" ADD CONSTRAINT "ExternalDataReference_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "Result"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalDataReference" ADD CONSTRAINT "ExternalDataReference_championshipStandingId_fkey" FOREIGN KEY ("championshipStandingId") REFERENCES "ChampionshipStanding"("id") ON DELETE CASCADE ON UPDATE CASCADE;
