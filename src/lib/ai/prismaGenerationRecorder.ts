import type { GenerationRecorder } from "./ports";
import { getDatabase } from "@/lib/db/client";

export class PrismaGenerationRecorder implements GenerationRecorder {
  async record(input: Parameters<GenerationRecorder["record"]>[0]): Promise<void> {
    const database = getDatabase();
    await database.aiGeneration.upsert({
      where: { idempotencyKey: input.idempotencyKey },
      update: {},
      create: {
        raceMomentId: input.momentId,
        kind: "EXPLANATION",
        status: input.status === "validated" ? "VALIDATED" : "FALLBACK",
        idempotencyKey: input.idempotencyKey,
        providerResponseId: input.metadata.generationId,
        model: input.metadata.model,
        promptVersion: input.metadata.promptVersion,
        contextReference: `raceMoment:${input.momentId}`,
        output: input.output,
        validationStatus: input.status,
        sources: {
          create: input.output.citedSourceIds.map((sourceId) => ({ source: { connect: { id: sourceId } } })),
        },
      },
    });
  }
}
