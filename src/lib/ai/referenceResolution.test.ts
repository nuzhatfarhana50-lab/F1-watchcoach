import { describe, expect, it } from "vitest";

import { canonicalFixtureIds } from "@/lib/f1/fixtures/canonical-races";

import { FixtureGroundingRetriever } from "./fixtureGroundingRetriever";
import { resolveConceptClassification, resolveConnectionDiscovery } from "./referenceResolution";

describe("AI real-ID resolution", () => {
  it("accepts only retrieved concept and moment IDs", async () => {
    const context = (await new FixtureGroundingRetriever().retrieve(canonicalFixtureIds.hamiltonMoment))!;
    expect(resolveConceptClassification({ conceptIds: [context.concepts[0]!.id], confidence: 0.9, rationale: "The stop timing demonstrates the retrieved concept." }, context).confidence).toBe(0.9);
    expect(resolveConnectionDiscovery({ connections: [{ momentId: context.candidateMoments[0]!.id, reason: "similarStrategy", explanation: "Both involve crossover timing." }] }, context).connections).toHaveLength(1);
    expect(() => resolveConnectionDiscovery({ connections: [{ momentId: "ffffffff-ffff-4fff-8fff-ffffffffffff", reason: "similarStrategy", explanation: "Invented." }] }, context)).toThrow("unknown moment");
  });
});
