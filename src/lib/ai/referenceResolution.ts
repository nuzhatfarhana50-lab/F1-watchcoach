import { AiGenerationError } from "./errors";
import { conceptClassificationSchema, connectionDiscoverySchema, type GroundingContext } from "./schemas";

export function resolveConceptClassification(output: unknown, context: GroundingContext) {
  const parsed = conceptClassificationSchema.safeParse(output);
  const allowed = new Set(context.concepts.map((concept) => concept.id));
  if (!parsed.success || !parsed.data.conceptIds.every((id) => allowed.has(id))) {
    throw new AiGenerationError("ungroundedReferences", "Concept classification referenced an unknown concept");
  }
  return parsed.data;
}

export function resolveConnectionDiscovery(output: unknown, context: GroundingContext) {
  const parsed = connectionDiscoverySchema.safeParse(output);
  const allowed = new Set(context.candidateMoments.map((moment) => moment.id));
  if (!parsed.success || !parsed.data.connections.every((connection) => allowed.has(connection.momentId))) {
    throw new AiGenerationError("ungroundedReferences", "Connection discovery referenced an unknown moment");
  }
  return parsed.data;
}
