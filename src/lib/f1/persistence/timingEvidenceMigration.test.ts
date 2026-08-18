import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const typesMigrationPath = resolve(
  process.cwd(),
  "prisma/migrations/20260818193000_phase1_timing_evidence_types/migration.sql",
);
const evidenceMigrationPath = resolve(
  process.cwd(),
  "prisma/migrations/20260818193100_phase1_timing_evidence/migration.sql",
);
const typesSql = readFileSync(typesMigrationPath, "utf8");
const evidenceSql = readFileSync(evidenceMigrationPath, "utf8");

describe("Phase 1 timing-evidence migration", () => {
  it("contains every approved evidence table", () => {
    for (const table of ["Lap", "Position", "PitStop", "TyreStint", "RaceControlEvent", "Result", "ChampionshipStanding"]) {
      expect(evidenceSql).toContain(`CREATE TABLE \"${table}\"`);
    }
  });

  it("commits enum additions before constraints use the new values", () => {
    expect(typesSql).toContain("ALTER TYPE \"ExternalResourceType\" ADD VALUE 'LAP'");
    expect(typesSql).toContain("CREATE TYPE \"TyreCompound\"");
    expect(evidenceSql).not.toContain("ALTER TYPE \"ExternalResourceType\" ADD VALUE");
    expect(evidenceSql).toContain('WHEN \'LAP\' THEN "lapId" IS NOT NULL');
  });

  it("enforces ranges, standing targets, and typed provenance targets", () => {
    for (const constraint of ["Lap_bounds_check", "Position_bounds_check", "PitStop_bounds_check", "TyreStint_bounds_check", "RaceControlEvent_bounds_check", "Result_bounds_check", "ChampionshipStanding_target_bounds_check"]) {
      expect(evidenceSql).toContain(constraint);
    }
    expect(evidenceSql).toContain('WHEN \'LAP\' THEN "lapId" IS NOT NULL');
    expect(evidenceSql).toContain('WHEN \'CHAMPIONSHIP_STANDING\' THEN "championshipStandingId" IS NOT NULL');
  });
});
