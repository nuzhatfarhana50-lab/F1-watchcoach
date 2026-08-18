-- CreateEnum
CREATE TYPE "ConceptCategory" AS ENUM ('STRATEGY', 'TYRES', 'RACING', 'ENGINEERING', 'REGULATIONS');

-- CreateEnum
CREATE TYPE "MediaProvider" AS ENUM ('OFFICIAL_F1', 'YOUTUBE', 'WIKIMEDIA', 'FIA', 'TEAM', 'DRIVER');

-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('VIDEO', 'IMAGE', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "MomentConnectionReason" AS ENUM ('SAME_CONCEPT', 'SAME_DRIVER', 'SAME_CIRCUIT', 'SIMILAR_STRATEGY', 'HISTORICAL_PARALLEL', 'CHAMPIONSHIP_CONTEXT', 'TECHNICAL_PARALLEL', 'TEAM_HISTORY');

-- CreateTable
CREATE TABLE "Concept" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "ConceptCategory" NOT NULL,
    "definition" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Concept_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RaceMomentConcept" (
    "raceMomentId" UUID NOT NULL,
    "conceptId" UUID NOT NULL,

    CONSTRAINT "RaceMomentConcept_pkey" PRIMARY KEY ("raceMomentId","conceptId")
);

-- CreateTable
CREATE TABLE "ConceptSource" (
    "conceptId" UUID NOT NULL,
    "sourceId" UUID NOT NULL,

    CONSTRAINT "ConceptSource_pkey" PRIMARY KEY ("conceptId","sourceId")
);

-- CreateTable
CREATE TABLE "Explanation" (
    "id" UUID NOT NULL,
    "raceMomentId" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "whatHappened" TEXT NOT NULL,
    "whyItHappened" TEXT NOT NULL,
    "whyItMatters" TEXT NOT NULL,
    "watchNext" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Explanation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExplanationConcept" (
    "explanationId" UUID NOT NULL,
    "conceptId" UUID NOT NULL,

    CONSTRAINT "ExplanationConcept_pkey" PRIMARY KEY ("explanationId","conceptId")
);

-- CreateTable
CREATE TABLE "ExplanationSource" (
    "explanationId" UUID NOT NULL,
    "sourceId" UUID NOT NULL,

    CONSTRAINT "ExplanationSource_pkey" PRIMARY KEY ("explanationId","sourceId")
);

-- CreateTable
CREATE TABLE "Media" (
    "id" UUID NOT NULL,
    "provider" "MediaProvider" NOT NULL,
    "providerId" TEXT,
    "kind" "MediaKind" NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "embedUrl" TEXT,
    "startTimestampSeconds" INTEGER,
    "license" TEXT,
    "attribution" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RaceMomentMedia" (
    "raceMomentId" UUID NOT NULL,
    "mediaId" UUID NOT NULL,

    CONSTRAINT "RaceMomentMedia_pkey" PRIMARY KEY ("raceMomentId","mediaId")
);

-- CreateTable
CREATE TABLE "MediaSource" (
    "mediaId" UUID NOT NULL,
    "sourceId" UUID NOT NULL,

    CONSTRAINT "MediaSource_pkey" PRIMARY KEY ("mediaId","sourceId")
);

-- CreateTable
CREATE TABLE "MomentConnection" (
    "id" UUID NOT NULL,
    "sourceMomentId" UUID NOT NULL,
    "targetMomentId" UUID NOT NULL,
    "reason" "MomentConnectionReason" NOT NULL,
    "explanation" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "MomentConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MomentConnectionSource" (
    "momentConnectionId" UUID NOT NULL,
    "sourceId" UUID NOT NULL,

    CONSTRAINT "MomentConnectionSource_pkey" PRIMARY KEY ("momentConnectionId","sourceId")
);

-- AddCheckConstraint
ALTER TABLE "Media"
ADD CONSTRAINT "Media_start_timestamp_check"
CHECK ("startTimestampSeconds" IS NULL OR "startTimestampSeconds" >= 0);

-- AddCheckConstraint
ALTER TABLE "MomentConnection"
ADD CONSTRAINT "MomentConnection_no_self_check"
CHECK ("sourceMomentId" <> "targetMomentId");

-- CreateIndex
CREATE UNIQUE INDEX "Concept_slug_key" ON "Concept"("slug");

-- CreateIndex
CREATE INDEX "Concept_category_name_idx" ON "Concept"("category", "name");

-- CreateIndex
CREATE INDEX "RaceMomentConcept_conceptId_idx" ON "RaceMomentConcept"("conceptId");

-- CreateIndex
CREATE INDEX "ConceptSource_sourceId_idx" ON "ConceptSource"("sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "Explanation_raceMomentId_slug_key" ON "Explanation"("raceMomentId", "slug");

-- CreateIndex
CREATE INDEX "ExplanationConcept_conceptId_idx" ON "ExplanationConcept"("conceptId");

-- CreateIndex
CREATE INDEX "ExplanationSource_sourceId_idx" ON "ExplanationSource"("sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "Media_url_key" ON "Media"("url");

-- CreateIndex
CREATE INDEX "Media_kind_idx" ON "Media"("kind");

-- CreateIndex
CREATE UNIQUE INDEX "Media_provider_providerId_key" ON "Media"("provider", "providerId");

-- CreateIndex
CREATE INDEX "RaceMomentMedia_mediaId_idx" ON "RaceMomentMedia"("mediaId");

-- CreateIndex
CREATE INDEX "MediaSource_sourceId_idx" ON "MediaSource"("sourceId");

-- CreateIndex
CREATE INDEX "MomentConnection_targetMomentId_reason_idx" ON "MomentConnection"("targetMomentId", "reason");

-- CreateIndex
CREATE UNIQUE INDEX "MomentConnection_sourceMomentId_targetMomentId_reason_key" ON "MomentConnection"("sourceMomentId", "targetMomentId", "reason");

-- CreateIndex
CREATE INDEX "MomentConnectionSource_sourceId_idx" ON "MomentConnectionSource"("sourceId");

-- AddForeignKey
ALTER TABLE "RaceMomentConcept" ADD CONSTRAINT "RaceMomentConcept_raceMomentId_fkey" FOREIGN KEY ("raceMomentId") REFERENCES "RaceMoment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaceMomentConcept" ADD CONSTRAINT "RaceMomentConcept_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "Concept"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptSource" ADD CONSTRAINT "ConceptSource_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "Concept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptSource" ADD CONSTRAINT "ConceptSource_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Explanation" ADD CONSTRAINT "Explanation_raceMomentId_fkey" FOREIGN KEY ("raceMomentId") REFERENCES "RaceMoment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExplanationConcept" ADD CONSTRAINT "ExplanationConcept_explanationId_fkey" FOREIGN KEY ("explanationId") REFERENCES "Explanation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExplanationConcept" ADD CONSTRAINT "ExplanationConcept_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "Concept"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExplanationSource" ADD CONSTRAINT "ExplanationSource_explanationId_fkey" FOREIGN KEY ("explanationId") REFERENCES "Explanation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExplanationSource" ADD CONSTRAINT "ExplanationSource_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaceMomentMedia" ADD CONSTRAINT "RaceMomentMedia_raceMomentId_fkey" FOREIGN KEY ("raceMomentId") REFERENCES "RaceMoment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaceMomentMedia" ADD CONSTRAINT "RaceMomentMedia_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaSource" ADD CONSTRAINT "MediaSource_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaSource" ADD CONSTRAINT "MediaSource_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MomentConnection" ADD CONSTRAINT "MomentConnection_sourceMomentId_fkey" FOREIGN KEY ("sourceMomentId") REFERENCES "RaceMoment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MomentConnection" ADD CONSTRAINT "MomentConnection_targetMomentId_fkey" FOREIGN KEY ("targetMomentId") REFERENCES "RaceMoment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MomentConnectionSource" ADD CONSTRAINT "MomentConnectionSource_momentConnectionId_fkey" FOREIGN KEY ("momentConnectionId") REFERENCES "MomentConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MomentConnectionSource" ADD CONSTRAINT "MomentConnectionSource_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
