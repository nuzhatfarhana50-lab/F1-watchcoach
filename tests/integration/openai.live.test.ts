import { describe, expect, it } from "vitest";

import { OpenAiAdapter } from "@/lib/ai/openaiAdapter";
import { FixtureGroundingRetriever } from "@/lib/ai/fixtureGroundingRetriever";
import { groundedExplanationSchema } from "@/lib/ai/schemas";
import { canonicalFixtureIds } from "@/lib/f1/fixtures/canonical-races";

const enabled = process.env.LIVE_OPENAI_EVALS === "1" && Boolean(process.env.OPENAI_API_KEY);

describe.skipIf(!enabled)("live OpenAI grounded explanation evaluation", () => {
  it("returns schema-valid output whose IDs resolve to retrieved records", async () => {
    const context = await new FixtureGroundingRetriever().retrieve(canonicalFixtureIds.hamiltonMoment);
    const adapter = new OpenAiAdapter(process.env.OPENAI_API_KEY!);
    const generated = groundedExplanationSchema.parse((await adapter.generate(context!)).output);
    expect(generated.conceptIds.every((id) => context!.concepts.some((concept) => concept.id === id))).toBe(true);
    expect(generated.relatedMomentIds.every((id) => context!.candidateMoments.some((moment) => moment.id === id))).toBe(true);
    expect(generated.citedSourceIds.every((id) => context!.sources.some((source) => source.id === id))).toBe(true);
  });
});
