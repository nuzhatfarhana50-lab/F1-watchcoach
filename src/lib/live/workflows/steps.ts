import type { OpenF1SessionEvidence } from "@/lib/f1/providers/contracts";

import { detectMoments } from "../momentDetector";
import type { LiveMomentCandidate } from "../types";
import type { LiveIngestionWorkflowInput } from "./liveIngestionWorkflow";

type EvidenceCheckpoint = { sessionKey: number; evidence: OpenF1SessionEvidence };
type DetectionCheckpoint = EvidenceCheckpoint & { moments: readonly LiveMomentCandidate[] };

export async function fetchOpenF1Evidence(input: LiveIngestionWorkflowInput): Promise<EvidenceCheckpoint> {
  "use step";
  const { f1Providers } = await import("@/lib/f1/providers/composition");
  return { sessionKey: input.sessionKey, evidence: await f1Providers.recent.getSessionEvidence(input.sessionKey) };
}

export async function cacheNormalizedEvidence(input: EvidenceCheckpoint): Promise<EvidenceCheckpoint> {
  "use step";
  const { liveSessionService } = await import("../composition");
  await liveSessionService.publish(input.sessionKey, input.evidence, []);
  return input;
}

export async function detectLiveMoments(input: EvidenceCheckpoint): Promise<DetectionCheckpoint> {
  "use step";
  return { ...input, moments: detectMoments(input.sessionKey, input.evidence) };
}

export async function persistDetectedMoments(input: DetectionCheckpoint) {
  "use step";
  const { liveMomentPersistence } = await import("../composition");
  return liveMomentPersistence.persist(input.sessionKey, input.moments);
}

export async function enrichLiveMoments(input: DetectionCheckpoint): Promise<DetectionCheckpoint> {
  "use step";
  return input;
}

export async function publishLiveState(input: DetectionCheckpoint) {
  "use step";
  const { liveSessionService } = await import("../composition");
  return liveSessionService.publish(input.sessionKey, input.evidence, input.moments);
}
