import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = resolve(
  process.cwd(),
  "prisma/migrations/20260818195500_phase1_learning_content/migration.sql",
);
const sql = readFileSync(migrationPath, "utf8");

describe("Phase 1 learning-content migration", () => {
  it("contains every approved content and provenance table", () => {
    for (const table of [
      "Concept",
      "RaceMomentConcept",
      "ConceptSource",
      "Explanation",
      "ExplanationConcept",
      "ExplanationSource",
      "Media",
      "RaceMomentMedia",
      "MediaSource",
      "MomentConnection",
      "MomentConnectionSource",
    ]) {
      expect(sql).toContain(`CREATE TABLE \"${table}\"`);
    }
  });

  it("preserves media and connection safety rules", () => {
    expect(sql).toContain("Media_start_timestamp_check");
    expect(sql).toContain("MomentConnection_no_self_check");
    expect(sql).toContain('REFERENCES "Source"("id") ON DELETE RESTRICT');
    expect(sql).toContain("MomentConnection_sourceMomentId_targetMomentId_reason_key");
  });
});
