CREATE TYPE "ExplanationDepth" AS ENUM ('BEGINNER', 'STANDARD', 'DETAILED');
CREATE TYPE "LearningStyle" AS ENUM ('BALANCED', 'VISUAL', 'TECHNICAL');
CREATE TYPE "RaceProgressStatus" AS ENUM ('STARTED', 'COMPLETED');
CREATE TYPE "LearningState" AS ENUM ('UNSEEN', 'ENCOUNTERED', 'LEARNING', 'UNDERSTOOD', 'REINFORCED');

CREATE TABLE "User" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "externalAuthId" TEXT NOT NULL,
  "explanationDepth" "ExplanationDepth" NOT NULL DEFAULT 'BEGINNER', "learningStyle" "LearningStyle" NOT NULL DEFAULT 'BALANCED',
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id"), CONSTRAINT "User_externalAuthId_nonempty" CHECK (length(btrim("externalAuthId")) > 0)
);

CREATE TABLE "UserRaceHistory" (
  "userId" UUID NOT NULL, "raceId" UUID NOT NULL, "status" "RaceProgressStatus" NOT NULL DEFAULT 'STARTED',
  "progressPercent" INTEGER NOT NULL DEFAULT 0, "lastMomentId" UUID, "lastViewedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "completedAt" TIMESTAMPTZ(3),
  CONSTRAINT "UserRaceHistory_pkey" PRIMARY KEY ("userId", "raceId"), CONSTRAINT "UserRaceHistory_progress_range" CHECK ("progressPercent" BETWEEN 0 AND 100),
  CONSTRAINT "UserRaceHistory_completion_consistency" CHECK (("status" = 'COMPLETED' AND "progressPercent" = 100 AND "completedAt" IS NOT NULL) OR ("status" = 'STARTED' AND "progressPercent" < 100 AND "completedAt" IS NULL)),
  CONSTRAINT "UserRaceHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "UserRaceHistory_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "Race"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "UserRaceHistory_lastMomentId_fkey" FOREIGN KEY ("lastMomentId") REFERENCES "RaceMoment"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "UserMomentEncounter" (
  "userId" UUID NOT NULL, "raceMomentId" UUID NOT NULL, "encounterCount" INTEGER NOT NULL DEFAULT 1,
  "firstSeenAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "lastSeenAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserMomentEncounter_pkey" PRIMARY KEY ("userId", "raceMomentId"), CONSTRAINT "UserMomentEncounter_positive_count" CHECK ("encounterCount" > 0),
  CONSTRAINT "UserMomentEncounter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "UserMomentEncounter_raceMomentId_fkey" FOREIGN KEY ("raceMomentId") REFERENCES "RaceMoment"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "UserLearningState" (
  "userId" UUID NOT NULL, "conceptId" UUID NOT NULL, "state" "LearningState" NOT NULL DEFAULT 'UNSEEN',
  "encounterCount" INTEGER NOT NULL DEFAULT 0, "lastUpdatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserLearningState_pkey" PRIMARY KEY ("userId", "conceptId"), CONSTRAINT "UserLearningState_nonnegative_count" CHECK ("encounterCount" >= 0),
  CONSTRAINT "UserLearningState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "UserLearningState_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "Concept"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "UserInterest" (
  "userId" UUID NOT NULL, "topic" TEXT NOT NULL, "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserInterest_pkey" PRIMARY KEY ("userId", "topic"), CONSTRAINT "UserInterest_topic_nonempty" CHECK (length(btrim("topic")) > 0),
  CONSTRAINT "UserInterest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "UserDriverPreference" (
  "userId" UUID NOT NULL, "driverId" UUID NOT NULL, "weight" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "UserDriverPreference_pkey" PRIMARY KEY ("userId", "driverId"), CONSTRAINT "UserDriverPreference_weight_range" CHECK ("weight" BETWEEN 1 AND 5),
  CONSTRAINT "UserDriverPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "UserDriverPreference_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "UserTeamPreference" (
  "userId" UUID NOT NULL, "teamId" UUID NOT NULL, "weight" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "UserTeamPreference_pkey" PRIMARY KEY ("userId", "teamId"), CONSTRAINT "UserTeamPreference_weight_range" CHECK ("weight" BETWEEN 1 AND 5),
  CONSTRAINT "UserTeamPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "UserTeamPreference_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "User_externalAuthId_key" ON "User"("externalAuthId");
CREATE INDEX "UserRaceHistory_userId_lastViewedAt_idx" ON "UserRaceHistory"("userId", "lastViewedAt");
CREATE INDEX "UserRaceHistory_raceId_idx" ON "UserRaceHistory"("raceId");
CREATE INDEX "UserRaceHistory_lastMomentId_idx" ON "UserRaceHistory"("lastMomentId");
CREATE INDEX "UserMomentEncounter_raceMomentId_idx" ON "UserMomentEncounter"("raceMomentId");
CREATE INDEX "UserLearningState_conceptId_state_idx" ON "UserLearningState"("conceptId", "state");
CREATE INDEX "UserDriverPreference_driverId_idx" ON "UserDriverPreference"("driverId");
CREATE INDEX "UserTeamPreference_teamId_idx" ON "UserTeamPreference"("teamId");
