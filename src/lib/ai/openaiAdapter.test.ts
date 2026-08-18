import { describe, expect, it, vi } from "vitest";

import { canonicalFixtureIds } from "@/lib/f1/fixtures/canonical-races";

import { FixtureGroundingRetriever } from "./fixtureGroundingRetriever";
import { OpenAiAdapter } from "./openaiAdapter";

describe("OpenAiAdapter", () => {
  it("requests strict Responses API output and returns parsed generation metadata", async () => {
    const context = await new FixtureGroundingRetriever().retrieve(canonicalFixtureIds.hamiltonMoment);
    const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body.text.format).toMatchObject({ type: "json_schema", strict: true });
      return new Response(JSON.stringify({
        id: "resp_123",
        model: "gpt-5-mini",
        created_at: 1_776_000_000,
        output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(context!.curatedFallback) }] }],
      }), { status: 200 });
    });

    const result = await new OpenAiAdapter("test-key-that-is-long-enough", "gpt-5-mini", "text-embedding-3-small", fetcher as typeof fetch).generate(context!);
    expect(result.metadata).toMatchObject({ generationId: "resp_123", model: "gpt-5-mini" });
    expect(result.output).toEqual(context!.curatedFallback);
  });

  it("preserves embedding order", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      model: "text-embedding-3-small",
      data: [{ index: 1, embedding: [0, 1] }, { index: 0, embedding: [1, 0] }],
    }), { status: 200 }));
    const result = await new OpenAiAdapter("test-key-that-is-long-enough", undefined, undefined, fetcher as typeof fetch).embed(["first", "second"]);
    expect(result.vectors).toEqual([[1, 0], [0, 1]]);
  });
});
