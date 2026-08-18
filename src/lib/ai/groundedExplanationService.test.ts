import { describe, expect, it, vi } from "vitest";

import { canonicalFixtureIds } from "@/lib/f1/fixtures/canonical-races";

import { FixtureGroundingRetriever } from "./fixtureGroundingRetriever";
import { GroundedExplanationService, InMemoryExplanationCache, InMemoryGenerationRecorder } from "./groundedExplanationService";
import type { ExplanationGenerator } from "./ports";

function generator(output: unknown): ExplanationGenerator {
  return {
    generate: vi.fn(async () => ({
      output,
      metadata: { generationId: "generation-1", model: "deterministic-test", promptVersion: "grounded-explanation-v1", createdAt: "2026-08-18T12:00:00.000Z" },
    })),
  };
}

describe("GroundedExplanationService", () => {
  it("validates structured output and resolves every generated ID", async () => {
    const retriever = new FixtureGroundingRetriever();
    const context = await retriever.retrieve(canonicalFixtureIds.hamiltonMoment);
    const model = generator(context!.curatedFallback);
    const service = new GroundedExplanationService(retriever, model, new InMemoryExplanationCache(), new InMemoryGenerationRecorder());

    await expect(service.explain(canonicalFixtureIds.hamiltonMoment)).resolves.toMatchObject({ source: "generated" });
  });

  it("rejects invented IDs and falls back to curated grounded content", async () => {
    const retriever = new FixtureGroundingRetriever();
    const context = await retriever.retrieve(canonicalFixtureIds.hamiltonMoment);
    const invented = { ...context!.curatedFallback, relatedMomentIds: ["ffffffff-ffff-4fff-8fff-ffffffffffff"] };
    const recorder = new InMemoryGenerationRecorder();
    const service = new GroundedExplanationService(retriever, generator(invented), new InMemoryExplanationCache(), recorder);

    await expect(service.explain(canonicalFixtureIds.hamiltonMoment)).resolves.toMatchObject({ source: "curatedFallback" });
    expect(recorder.records.get(`grounded-explanation-v1:${canonicalFixtureIds.hamiltonMoment}`)?.status).toBe("fallback");
  });

  it("caches stable generations and does not regenerate on repeated reads", async () => {
    const retriever = new FixtureGroundingRetriever();
    const context = await retriever.retrieve(canonicalFixtureIds.hamiltonMoment);
    const model = generator(context!.curatedFallback);
    const service = new GroundedExplanationService(retriever, model, new InMemoryExplanationCache(), new InMemoryGenerationRecorder());

    await service.explain(canonicalFixtureIds.hamiltonMoment);
    await expect(service.explain(canonicalFixtureIds.hamiltonMoment)).resolves.toMatchObject({ source: "cache" });
    expect(model.generate).toHaveBeenCalledTimes(1);
  });
});
