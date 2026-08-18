import { describe, expect, it } from "vitest";

import { britishReplayEvidence } from "./fixtures/britishReplay";
import { detectMoments } from "./momentDetector";

describe("detectMoments", () => {
  it("detects high-confidence structured signals and ignores an ordinary finish flag", () => {
    const candidates = detectMoments(9539, britishReplayEvidence);
    expect(candidates.map((candidate) => candidate.type)).toEqual(expect.arrayContaining([
      "OVERTAKE", "PIT_STOP", "STRATEGY_CHANGE", "VIRTUAL_SAFETY_CAR", "PENALTY",
    ]));
    expect(candidates).toHaveLength(5);
    expect(candidates.every((candidate) => candidate.confidence >= 0.9)).toBe(true);
  });

  it("returns stable unique IDs when the same timeline is replayed", () => {
    const first = detectMoments(9539, britishReplayEvidence);
    const second = detectMoments(9539, britishReplayEvidence);
    expect(second).toEqual(first);
    expect(new Set(first.map((candidate) => candidate.id)).size).toBe(first.length);
  });
});
