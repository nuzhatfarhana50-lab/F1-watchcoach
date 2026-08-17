import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = resolve(process.cwd(), "prisma/migrations/20260817173000_phase1_core/migration.sql");
const sql = readFileSync(migrationPath, "utf8");

describe("Phase 1 core migration", () => {
  it("contains the approved core tables", () => {
    for (const table of ["Season", "Circuit", "GrandPrix", "Session", "Race", "Driver", "Team", "TeamSeasonIdentity", "DriverTeamMembership", "RaceMoment", "Source", "ExternalDataReference"]) {
      expect(sql).toContain(`CREATE TABLE \"${table}\"`);
    }
  });

  it("protects temporal and external-reference invariants in SQL", () => {
    expect(sql).toContain("TeamSeasonIdentity_valid_range");
    expect(sql).toContain("DriverTeamMembership_valid_range");
    expect(sql).toContain("ExternalDataReference_single_target");
    expect(sql).toContain('WHEN \'RACE_MOMENT\' THEN "raceMomentId" IS NOT NULL');
  });
});
