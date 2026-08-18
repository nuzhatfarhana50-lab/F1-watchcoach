import type { MomentDetailReadModel } from "@/lib/f1/application/raceLibraryService";

import type { ExplanationDepth, LearningState } from "./types";

type Explanation = MomentDetailReadModel["explanation"];

export function personalizeExplanation(
  explanation: Explanation,
  conceptStates: readonly LearningState[],
  depth: ExplanationDepth,
): Explanation {
  const hasEstablishedContext = conceptStates.some((state) => state === "UNDERSTOOD" || state === "REINFORCED");
  if (!hasEstablishedContext) return explanation;

  const continuity = depth === "DETAILED"
    ? "You have seen this pattern before; compare the timing trigger and tyre trade-off this time."
    : "This reinforces a pattern you already know.";

  return { ...explanation, whyItMatters: `${continuity} ${explanation.whyItMatters}` };
}
