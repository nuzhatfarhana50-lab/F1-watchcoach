-- CreateEnum
CREATE TYPE "TyreCompound" AS ENUM ('SOFT', 'MEDIUM', 'HARD', 'INTERMEDIATE', 'WET', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "RaceControlCategory" AS ENUM ('SAFETY_CAR', 'VIRTUAL_SAFETY_CAR', 'RED_FLAG', 'PENALTY', 'FLAG', 'WEATHER', 'OTHER');

-- CreateEnum
CREATE TYPE "StandingKind" AS ENUM ('DRIVER', 'CONSTRUCTOR');

-- AlterEnum
-- PostgreSQL requires these enum values to be committed before a later
-- migration can reference them from a constraint expression.
ALTER TYPE "ExternalResourceType" ADD VALUE 'LAP';
ALTER TYPE "ExternalResourceType" ADD VALUE 'POSITION';
ALTER TYPE "ExternalResourceType" ADD VALUE 'PIT_STOP';
ALTER TYPE "ExternalResourceType" ADD VALUE 'TYRE_STINT';
ALTER TYPE "ExternalResourceType" ADD VALUE 'RACE_CONTROL_EVENT';
ALTER TYPE "ExternalResourceType" ADD VALUE 'RESULT';
ALTER TYPE "ExternalResourceType" ADD VALUE 'CHAMPIONSHIP_STANDING';
