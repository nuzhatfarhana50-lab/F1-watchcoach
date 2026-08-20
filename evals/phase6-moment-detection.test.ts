import { describe, expect, it } from "vitest";

import { britishReplayEvidence, britishReplayLabels } from "@/lib/live/fixtures/britishReplay";
import { detectMoments } from "@/lib/live/momentDetector";

describe("Phase 6 replay evaluation", () => {
  it("meets precision >= 0.90 and recall >= 0.75", () => {
    const detected = detectMoments(9558, britishReplayEvidence);
    const detectedLabels = detected.map((candidate) => `${candidate.type}:${candidate.evidenceExternalIds[0]}`);
    const truePositives = detectedLabels.filter((label) => britishReplayLabels.includes(label as typeof britishReplayLabels[number])).length;
    const precision = truePositives / detectedLabels.length;
    const recall = truePositives / britishReplayLabels.length;
    expect(precision).toBeGreaterThanOrEqual(0.9);
    expect(recall).toBeGreaterThanOrEqual(0.75);
  });
});
