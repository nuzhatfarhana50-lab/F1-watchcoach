import {
  cacheNormalizedEvidence,
  detectLiveMoments,
  enrichLiveMoments,
  fetchOpenF1Evidence,
  persistDetectedMoments,
  publishLiveState,
} from "./steps";

export type LiveIngestionWorkflowInput = { sessionKey: number };

export async function liveIngestionWorkflow(input: LiveIngestionWorkflowInput) {
  "use workflow";
  const fetched = await fetchOpenF1Evidence(input);
  const normalized = await cacheNormalizedEvidence(fetched);
  const detected = await detectLiveMoments(normalized);
  const persistence = await persistDetectedMoments(detected);
  const enriched = await enrichLiveMoments(detected);
  const published = await publishLiveState(enriched);
  return { checkpoint: published.checkpoint, momentCount: published.moments.length, persistence };
}
