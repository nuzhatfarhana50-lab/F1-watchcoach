import { describe, expect, it, vi } from "vitest";

import type { HistoricalRaceProvider, ProviderRaceResult, ProviderRaceSummary } from "@/lib/f1/providers/contracts";

import { RaceQuestionService } from "./raceQuestionService";

const abuDhabi2021: ProviderRaceSummary = {
  season: 2021,
  round: 22,
  name: "Abu Dhabi Grand Prix",
  date: "2021-12-12",
  circuit: { externalId: "yas_marina", name: "Yas Marina Circuit", locality: "Abu Dhabi", country: "UAE" },
  provenance: {
    provider: "jolpica",
    externalId: "2021:22",
    sourceUrl: "https://api.jolpi.ca/ergast/f1/2021/22/results.json",
    fetchedAt: "2026-08-20T00:00:00Z",
  },
};

const abuDhabiResult: ProviderRaceResult = {
  race: abuDhabi2021,
  results: [{
    position: 1,
    gridPosition: 1,
    lapsCompleted: 58,
    points: 26,
    status: "Finished",
    driver: { externalId: "max_verstappen", givenName: "Max", familyName: "Verstappen" },
    team: { externalId: "red_bull", name: "Red Bull Racing" },
    provenance: abuDhabi2021.provenance,
  }],
};

function provider(overrides: Partial<HistoricalRaceProvider> = {}): HistoricalRaceProvider {
  return {
    listRaces: vi.fn(async () => [abuDhabi2021]),
    getRaceResult: vi.fn(async () => abuDhabiResult),
    ...overrides,
  };
}

describe("RaceQuestionService", () => {
  it("blocks non-F1 open-ended questions before retrieval or generation", async () => {
    const historical = provider();
    const generator = { answerRaceQuestion: vi.fn() };
    const result = await new RaceQuestionService(historical, generator).ask({ question: "How to make noodles?" });

    expect(result.status).toBe("blocked");
    expect(historical.listRaces).not.toHaveBeenCalled();
    expect(historical.getRaceResult).not.toHaveBeenCalled();
    expect(generator.answerRaceQuestion).not.toHaveBeenCalled();
  });

  it("answers a canonical race question from curated evidence without a live provider", async () => {
    const historical = provider({
      listRaces: vi.fn(async () => { throw new Error("offline"); }),
      getRaceResult: vi.fn(async () => { throw new Error("offline"); }),
    });
    const result = await new RaceQuestionService(historical).ask({
      question: "Why did Hamilton’s final stop matter at the 2024 British Grand Prix?",
    });

    expect(result.status).toBe("answered");
    if (result.status !== "answered") return;
    expect(result.answer).toContain("Hamilton changed to soft slicks");
    expect(result.answer).toContain("changed the lead");
    expect(result.sources.length).toBeGreaterThan(0);
    expect(result.raceHref).toBe("/races/2024/12");
  });

  it("retrieves a historical race result through the Jolpica boundary", async () => {
    const result = await new RaceQuestionService(provider()).ask({ question: "Who won the 2021 Abu Dhabi Grand Prix?" });

    expect(result.status).toBe("answered");
    if (result.status !== "answered") return;
    expect(result.answer).toContain("Max Verstappen won");
    expect(result.sources).toEqual([expect.objectContaining({ provider: "jolpica" })]);
    expect(result.raceHref).toBeUndefined();
  });

  it("rejects invented model citations and falls back to deterministic evidence", async () => {
    const generator = {
      answerRaceQuestion: vi.fn(async () => ({ answer: "Unsupported answer", sourceIds: ["invented"] })),
    };
    const result = await new RaceQuestionService(provider(), generator).ask({
      question: "Why did Hamilton’s final stop matter at the 2024 British Grand Prix?",
    });

    expect(result.status).toBe("answered");
    if (result.status !== "answered") return;
    expect(result.generated).toBe(false);
    expect(result.answer).toContain("Hamilton changed to soft slicks");
    expect(generator.answerRaceQuestion).toHaveBeenCalledOnce();
  });

  it("asks for a season instead of guessing conversational context", async () => {
    const result = await new RaceQuestionService(provider()).ask({ question: "Who won the British Grand Prix?" });
    expect(result).toEqual(expect.objectContaining({ status: "needsContext" }));
  });
});
