import { describe, expect, it } from "vitest";

import { britishReplayEvidence } from "@/lib/live/fixtures/britishReplay";
import { dryStrategyReplay, incidentHeavyReplay, safetyAndRedFlagReplay } from "@/lib/live/fixtures/scenarioReplays";
import { detectMoments } from "@/lib/live/momentDetector";

describe("Phase 7 scenario regression set", () => {
  it.each([
    ["dry strategy", 1001, dryStrategyReplay, ["PIT_STOP", "STRATEGY_CHANGE"]],
    ["mixed weather", 9558, britishReplayEvidence, ["VIRTUAL_SAFETY_CAR", "STRATEGY_CHANGE"]],
    ["Safety Car and red flag", 1002, safetyAndRedFlagReplay, ["SAFETY_CAR", "RED_FLAG"]],
    ["incident heavy", 1003, incidentHeavyReplay, ["CRASH", "PENALTY", "TYRE_DEGRADATION"]],
  ])("covers %s signals", (_name, sessionKey, evidence, expectedTypes) => {
    const detectedTypes = detectMoments(sessionKey as number, evidence).map((candidate) => candidate.type);
    expect(detectedTypes).toEqual(expect.arrayContaining(expectedTypes));
  });
});
