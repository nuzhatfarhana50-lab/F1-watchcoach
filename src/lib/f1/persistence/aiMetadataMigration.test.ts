import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const sql = fs.readFileSync(path.join(process.cwd(), "prisma/migrations/20260818221000_phase4_ai_metadata/migration.sql"), "utf8");

describe("Phase 4 AI metadata migration", () => {
  it("enables pgvector and constrains embeddings to one real target", () => {
    expect(sql).toContain('CREATE EXTENSION IF NOT EXISTS "vector"');
    expect(sql).toContain('"embedding" vector(1536) NOT NULL');
    expect(sql).toContain('num_nonnulls("raceMomentId", "conceptId", "explanationId") = 1');
    expect(sql).toContain('"dimensions" = 1536');
  });

  it("makes generations idempotent and source attribution restrictive", () => {
    expect(sql).toContain('CREATE UNIQUE INDEX "AiGeneration_idempotencyKey_key"');
    expect(sql).toContain('REFERENCES "Source"("id") ON DELETE RESTRICT');
    expect(sql).toContain('REFERENCES "RaceMoment"("id") ON DELETE CASCADE');
  });
});
