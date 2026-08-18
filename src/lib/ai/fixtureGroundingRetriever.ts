import type { GroundingRetriever } from "./ports";
import type { GroundingContext } from "./schemas";
import { canonicalRaceFixtures } from "@/lib/f1/fixtures/canonical-races";

export class FixtureGroundingRetriever implements GroundingRetriever {
  async retrieve(momentId: string): Promise<GroundingContext | null> {
    const moment = canonicalRaceFixtures.moments.find((candidate) => candidate.id === momentId);
    if (!moment) return null;
    const sourceIds = new Set([
      ...moment.sourceIds,
      ...moment.explanation.sourceIds,
      ...moment.evidence.flatMap((evidence) => evidence.sourceIds),
      ...moment.concepts.flatMap((concept) => concept.sourceIds),
      ...moment.connections.flatMap((connection) => connection.sourceIds),
    ]);
    const candidates = moment.connections.flatMap((connection) => {
      const target = canonicalRaceFixtures.moments.find((candidate) => candidate.id === connection.targetMomentId);
      return target ? [{ id: target.id, title: target.title, reason: `${connection.reason}: ${connection.explanation}` }] : [];
    });
    return {
      momentId: moment.id,
      title: moment.title,
      summary: moment.summary,
      evidence: moment.evidence.map((evidence) => ({
        id: evidence.id,
        type: evidence.type,
        detail: JSON.stringify(evidence),
        sourceIds: evidence.sourceIds,
      })),
      concepts: moment.concepts.map((concept) => ({ id: concept.id, name: concept.name, definition: concept.definition })),
      candidateMoments: candidates,
      sources: canonicalRaceFixtures.sources.filter((source) => sourceIds.has(source.id)).map((source) => ({ id: source.id, title: source.title, url: source.url })),
      curatedFallback: {
        summary: moment.summary,
        whatHappened: moment.explanation.whatHappened,
        whyItHappened: moment.explanation.whyItHappened,
        whyItMatters: moment.explanation.whyItMatters,
        watchNext: moment.explanation.watchNext,
        conceptIds: moment.explanation.conceptIds,
        relatedMomentIds: moment.connections.map((connection) => connection.targetMomentId),
        citedSourceIds: moment.explanation.sourceIds,
      },
    };
  }
}
