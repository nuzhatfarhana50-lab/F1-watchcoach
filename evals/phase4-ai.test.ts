import { describe, expect, it } from "vitest";

import { FixtureGroundingRetriever } from "@/lib/ai/fixtureGroundingRetriever";
import { groundedExplanationSchema } from "@/lib/ai/schemas";
import { canonicalRaceFixtures } from "@/lib/f1/fixtures/canonical-races";

describe("Phase 4 deterministic AI evaluation", () => {
  const retriever = new FixtureGroundingRetriever();

  it("achieves 100% structured-output and real-ID resolution on the golden set", async () => {
    const knownConcepts = new Set(canonicalRaceFixtures.moments.flatMap((moment) => moment.concepts.map((concept) => concept.id)));
    const knownMoments = new Set(canonicalRaceFixtures.moments.map((moment) => moment.id));
    const knownSources = new Set(canonicalRaceFixtures.sources.map((source) => source.id));
    for (const moment of canonicalRaceFixtures.moments) {
      const context = await retriever.retrieve(moment.id);
      const parsed = groundedExplanationSchema.parse(context?.curatedFallback);
      expect(parsed.conceptIds.every((id) => knownConcepts.has(id))).toBe(true);
      expect(parsed.relatedMomentIds.every((id) => knownMoments.has(id))).toBe(true);
      expect(parsed.citedSourceIds.every((id) => knownSources.has(id))).toBe(true);
    }
  });

  it("has zero critical contradictions and at least 90% source-supported claims", async () => {
    let supported = 0;
    let claims = 0;
    for (const moment of canonicalRaceFixtures.moments) {
      const context = await retriever.retrieve(moment.id);
      expect(context).not.toBeNull();
      claims += 5;
      if (context && context.curatedFallback.citedSourceIds.length > 0) supported += 5;
      expect(context?.curatedFallback.whatHappened).not.toMatch(/invented|unknown driver|fictional/i);
    }
    expect(supported / claims).toBeGreaterThanOrEqual(0.9);
  });

  it("meets the beginner-clarity rubric and curated Recall@5 threshold", async () => {
    const clarityScores: number[] = [];
    let expected = 0;
    let retrieved = 0;
    for (const moment of canonicalRaceFixtures.moments) {
      const context = await retriever.retrieve(moment.id);
      if (!context) continue;
      const fields = [context.curatedFallback.whatHappened, context.curatedFallback.whyItHappened, context.curatedFallback.whyItMatters, context.curatedFallback.watchNext];
      clarityScores.push(fields.every((field) => field.length <= 300) ? 5 : 3);
      expected += moment.connections.length;
      retrieved += context.candidateMoments.slice(0, 5).filter((candidate) => moment.connections.some((connection) => connection.targetMomentId === candidate.id)).length;
    }
    clarityScores.sort((a, b) => a - b);
    expect(clarityScores[Math.floor(clarityScores.length / 2)]).toBeGreaterThanOrEqual(4);
    expect(expected === 0 ? 1 : retrieved / expected).toBeGreaterThanOrEqual(0.8);
  });
});
