import { describe, expect, it, vi } from "vitest";

import { canonicalFixtureIds } from "@/lib/f1/fixtures/canonical-races";

import { FixtureGroundingRetriever } from "./fixtureGroundingRetriever";
import { planF1Query } from "./f1QueryPlanner";
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

  it("restricts web retrieval to trusted F1 domains and exposes validated citations", async () => {
    const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body.tools[0]).toMatchObject({
        type: "web_search",
        filters: { allowed_domains: expect.arrayContaining(["formula1.com", "fia.com", "motorsport.com"]) },
      });
      expect(body.tool_choice).toBe("required");
      expect(body.max_tool_calls).toBe(3);
      expect(body.input[0].content).toContain("driver and team careers");
      return new Response(JSON.stringify({
        id: "resp_web",
        model: "gpt-5-mini",
        output: [
          {
            type: "web_search_call",
            action: {
              sources: [
                { type: "url", url: "https://www.formula1.com/en/latest/article/example" },
                { type: "url", url: "https://www.formula1.com/en/latest/article/considered-but-not-cited" },
              ],
            },
          },
          {
            type: "message",
            content: [{
              type: "output_text",
              text: "Ferrari announced the driver change; reported motivation should be kept separate from interpretation.",
              annotations: [
                { type: "url_citation", title: "Official Formula 1 report", url: "https://www.formula1.com/en/latest/article/example" },
                { type: "url_citation", title: "Untrusted", url: "https://example.com/speculation" },
              ],
            }],
          },
        ],
      }), { status: 200 });
    });
    const adapter = new OpenAiAdapter("test-key-that-is-long-enough", "gpt-5-mini", undefined, fetcher as typeof fetch);
    const plan = planF1Query("Why did Carlos Sainz leave Ferrari?", "F1_IN_SCOPE", [
      { type: "DRIVER", query: "Carlos Sainz", name: "Carlos Sainz", externalId: "sainz" },
      { type: "TEAM", query: "Ferrari", name: "Scuderia Ferrari", externalId: "ferrari" },
    ]);
    const result = await adapter.retrieveF1Web({ question: "Why did Carlos Sainz leave Ferrari?", plan, structuredFacts: [] });

    expect(result.sources).toEqual([expect.objectContaining({
      provider: "formula1.com",
      title: "Official Formula 1 report",
      url: "https://www.formula1.com/en/latest/article/example",
    })]);
  });

  it("validates the model fallback scope classifier", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      id: "resp_scope",
      model: "gpt-5-mini",
      output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify({ scope: "F1_IN_SCOPE" }) }] }],
    }), { status: 200 }));
    const adapter = new OpenAiAdapter("test-key-that-is-long-enough", undefined, undefined, fetcher as typeof fetch);
    await expect(adapter.classifyF1Scope("Who is an unfamiliar future F1 rookie?", [])).resolves.toBe("F1_IN_SCOPE");
  });

  it("permits approved secondary reporting in the same bounded search when primary coverage is incomplete", async () => {
    const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      const domains = body.tools[0].filters.allowed_domains as string[];
      expect(domains).toEqual(expect.arrayContaining(["formula1.com", "motorsport.com"]));
      return new Response(JSON.stringify({
        id: "resp_secondary",
        model: "gpt-5-mini",
        output: [{
          type: "message",
          content: [{
            type: "output_text",
            text: "The historical controversy is documented in the retrieved reporting.",
            annotations: [{ type: "url_citation", title: "Historical report", url: "https://www.motorsport.com/f1/example" }],
          }],
        }],
      }), { status: 200 });
    });
    const adapter = new OpenAiAdapter("test-key-that-is-long-enough", undefined, undefined, fetcher as typeof fetch);
    const plan = planF1Query("Why was Singapore 2008 controversial?", "F1_IN_SCOPE", [
      { type: "RACE", query: "Singapore", name: "2008 Singapore Grand Prix", externalId: "singapore" },
    ]);
    const result = await adapter.retrieveF1Web({ question: "Why was Singapore 2008 controversial?", plan, structuredFacts: [] });

    expect(fetcher).toHaveBeenCalledOnce();
    expect(result.sources).toEqual([expect.objectContaining({ provider: "motorsport.com" })]);
  });
});
