import { describe, expect, it } from "vitest";

import { personalizeExplanation } from "./personalizeExplanation";

const explanation = {
  whatHappened: "A real event happened.",
  whyItHappened: "The evidence explains why.",
  whyItMatters: "It changed the race.",
  watchNext: "Watch the timing gap.",
};

describe("personalizeExplanation", () => {
  it("preserves beginner grounding for new users", () => {
    expect(personalizeExplanation(explanation, ["UNSEEN"], "BEGINNER")).toEqual(explanation);
  });

  it("adds continuity only for established knowledge", () => {
    const personalized = personalizeExplanation(explanation, ["UNDERSTOOD"], "DETAILED");
    expect(personalized.whyItMatters).toContain("seen this pattern before");
    expect(personalized.whatHappened).toBe(explanation.whatHappened);
  });
});
