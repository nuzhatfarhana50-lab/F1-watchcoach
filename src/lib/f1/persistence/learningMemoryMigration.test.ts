import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const sql = readFileSync(resolve(process.cwd(), "prisma/migrations/20260818234500_phase5_learning_memory/migration.sql"), "utf8");

describe("Phase 5 learning-memory migration", () => {
  it("creates internal user, history, learning, and preference records", () => {
    for (const table of ["User", "UserRaceHistory", "UserMomentEncounter", "UserLearningState", "UserInterest", "UserDriverPreference", "UserTeamPreference"]) {
      expect(sql).toContain(`CREATE TABLE "${table}"`);
    }
  });

  it("enforces progress, counts, preference ranges, and scoped compound keys", () => {
    expect(sql).toContain("UserRaceHistory_completion_consistency");
    expect(sql).toContain("UserMomentEncounter_positive_count");
    expect(sql).toContain("UserLearningState_nonnegative_count");
    expect(sql).toContain('PRIMARY KEY ("userId", "raceId")');
    expect(sql).toContain('PRIMARY KEY ("userId", "conceptId")');
  });
});
