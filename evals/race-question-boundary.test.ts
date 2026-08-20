import { describe, expect, it, vi } from "vitest";

import { RaceQuestionService } from "@/lib/ai/raceQuestionService";
import type { HistoricalRaceProvider } from "@/lib/f1/providers/contracts";

function unavailableProvider(): HistoricalRaceProvider {
  return {
    listRaces: vi.fn(async () => { throw new Error("Live provider must not be needed for this golden set"); }),
    getRaceResult: vi.fn(async () => { throw new Error("Live provider must not be needed for this golden set"); }),
  };
}

describe("Home race-question boundary evaluation", () => {
  it("blocks 100% of the non-F1 golden set before any external call", async () => {
    const provider = unavailableProvider();
    const service = new RaceQuestionService(provider);
    const prompts = [
      "How to make noodles?",
      "Write me a poem about summer",
      "What is the best laptop to buy?",
      "Explain how mortgages work",
    ];

    const results = await Promise.all(prompts.map((question) => service.ask({ question })));
    expect(results.every((result) => result.status === "blocked")).toBe(true);
    expect(provider.listRaces).not.toHaveBeenCalled();
    expect(provider.getRaceResult).not.toHaveBeenCalled();
  });

  it("answers the canonical golden set with only known attributed F1 sources", async () => {
    const service = new RaceQuestionService(unavailableProvider());
    const prompts = [
      "Who won the 2024 British Grand Prix?",
      "Why did Hamilton’s final stop matter at the 2024 British Grand Prix?",
      "What happened when rain arrived at the 2023 Dutch Grand Prix?",
    ];

    const results = await Promise.all(prompts.map((question) => service.ask({ question })));
    for (const result of results) {
      expect(result.status).toBe("answered");
      if (result.status !== "answered") continue;
      expect(result.sources.length).toBeGreaterThan(0);
      expect(result.sources.every((source) => ["f1", "fia"].includes(source.provider))).toBe(true);
      expect(result.sources.every((source) => source.url.startsWith("https://"))).toBe(true);
      expect(result.answer).not.toMatch(/invented|according to my knowledge|I think/i);
    }
  });
});
