import { describe, expect, it } from "vitest";

import { canonicalRaceFixtures } from "@/lib/f1/fixtures/canonical-races";

describe("Phase 3 curated-content grounding evaluation", () => {
  const sourceIds = new Set(canonicalRaceFixtures.sources.map((source) => source.id));
  const momentIds = new Set(canonicalRaceFixtures.moments.map((moment) => moment.id));

  it("maps every displayed factual layer to known sources", () => {
    for (const moment of canonicalRaceFixtures.moments) {
      const factualLayers = [
        moment.sourceIds,
        moment.explanation.sourceIds,
        ...moment.evidence.map((evidence) => evidence.sourceIds),
        ...moment.concepts.map((concept) => concept.sourceIds),
        ...moment.media.map((media) => media.sourceIds),
        ...moment.connections.map((connection) => connection.sourceIds),
      ];
      for (const layer of factualLayers) {
        expect(layer.length, `${moment.slug} has an unsourced factual layer`).toBeGreaterThan(0);
        expect(layer.every((id) => sourceIds.has(id)), `${moment.slug} references an unknown source`).toBe(true);
      }
    }
  });

  it("connects only to real moments and records an explanatory reason", () => {
    for (const moment of canonicalRaceFixtures.moments) {
      for (const connection of moment.connections) {
        expect(momentIds.has(connection.targetMomentId)).toBe(true);
        expect(connection.targetMomentId).not.toBe(moment.id);
        expect(connection.explanation.length).toBeGreaterThan(30);
      }
    }
  });

  it("keeps protected media as attributed external references", () => {
    for (const media of canonicalRaceFixtures.moments.flatMap((moment) => moment.media)) {
      expect(media.url).toMatch(/^https:\/\//);
      expect(media.attribution.length).toBeGreaterThan(0);
      expect(media.embedUrl).toBeUndefined();
    }
  });
});
