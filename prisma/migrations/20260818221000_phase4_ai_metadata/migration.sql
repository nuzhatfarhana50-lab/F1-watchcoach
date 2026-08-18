CREATE EXTENSION IF NOT EXISTS "vector";

CREATE TYPE "AiGenerationKind" AS ENUM ('EXPLANATION', 'CONCEPT_CLASSIFICATION', 'CONNECTION_DISCOVERY');
CREATE TYPE "AiGenerationStatus" AS ENUM ('VALIDATED', 'FALLBACK', 'REJECTED');
CREATE TYPE "EmbeddingTargetType" AS ENUM ('RACE_MOMENT', 'CONCEPT', 'EXPLANATION');

CREATE TABLE "AiGeneration" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "raceMomentId" UUID NOT NULL,
  "kind" "AiGenerationKind" NOT NULL,
  "status" "AiGenerationStatus" NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "providerResponseId" TEXT,
  "model" TEXT NOT NULL,
  "promptVersion" TEXT NOT NULL,
  "contextReference" TEXT NOT NULL,
  "output" JSONB NOT NULL,
  "validationStatus" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiGeneration_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AiGeneration_raceMomentId_fkey" FOREIGN KEY ("raceMomentId") REFERENCES "RaceMoment"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AiGeneration_contextReference_nonempty" CHECK (length(btrim("contextReference")) > 0),
  CONSTRAINT "AiGeneration_validationStatus_nonempty" CHECK (length(btrim("validationStatus")) > 0)
);

CREATE TABLE "AiGenerationSource" (
  "aiGenerationId" UUID NOT NULL,
  "sourceId" UUID NOT NULL,
  CONSTRAINT "AiGenerationSource_pkey" PRIMARY KEY ("aiGenerationId", "sourceId"),
  CONSTRAINT "AiGenerationSource_aiGenerationId_fkey" FOREIGN KEY ("aiGenerationId") REFERENCES "AiGeneration"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AiGenerationSource_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "EmbeddingRecord" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "targetType" "EmbeddingTargetType" NOT NULL,
  "raceMomentId" UUID,
  "conceptId" UUID,
  "explanationId" UUID,
  "model" TEXT NOT NULL,
  "dimensions" INTEGER NOT NULL,
  "contentHash" TEXT NOT NULL,
  "embedding" vector(1536) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmbeddingRecord_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EmbeddingRecord_raceMomentId_fkey" FOREIGN KEY ("raceMomentId") REFERENCES "RaceMoment"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "EmbeddingRecord_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "Concept"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "EmbeddingRecord_explanationId_fkey" FOREIGN KEY ("explanationId") REFERENCES "Explanation"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "EmbeddingRecord_dimensions" CHECK ("dimensions" = 1536),
  CONSTRAINT "EmbeddingRecord_exactly_one_target" CHECK (num_nonnulls("raceMomentId", "conceptId", "explanationId") = 1),
  CONSTRAINT "EmbeddingRecord_target_matches_type" CHECK (
    ("targetType" = 'RACE_MOMENT' AND "raceMomentId" IS NOT NULL) OR
    ("targetType" = 'CONCEPT' AND "conceptId" IS NOT NULL) OR
    ("targetType" = 'EXPLANATION' AND "explanationId" IS NOT NULL)
  )
);

CREATE UNIQUE INDEX "AiGeneration_idempotencyKey_key" ON "AiGeneration"("idempotencyKey");
CREATE INDEX "AiGeneration_raceMomentId_kind_createdAt_idx" ON "AiGeneration"("raceMomentId", "kind", "createdAt");
CREATE INDEX "AiGeneration_model_promptVersion_idx" ON "AiGeneration"("model", "promptVersion");
CREATE INDEX "AiGenerationSource_sourceId_idx" ON "AiGenerationSource"("sourceId");
CREATE INDEX "EmbeddingRecord_raceMomentId_idx" ON "EmbeddingRecord"("raceMomentId");
CREATE INDEX "EmbeddingRecord_conceptId_idx" ON "EmbeddingRecord"("conceptId");
CREATE INDEX "EmbeddingRecord_explanationId_idx" ON "EmbeddingRecord"("explanationId");
CREATE INDEX "EmbeddingRecord_targetType_model_idx" ON "EmbeddingRecord"("targetType", "model");
CREATE UNIQUE INDEX "EmbeddingRecord_moment_model_hash_key" ON "EmbeddingRecord"("raceMomentId", "model", "contentHash") WHERE "raceMomentId" IS NOT NULL;
CREATE UNIQUE INDEX "EmbeddingRecord_concept_model_hash_key" ON "EmbeddingRecord"("conceptId", "model", "contentHash") WHERE "conceptId" IS NOT NULL;
CREATE UNIQUE INDEX "EmbeddingRecord_explanation_model_hash_key" ON "EmbeddingRecord"("explanationId", "model", "contentHash") WHERE "explanationId" IS NOT NULL;
