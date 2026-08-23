import { describe, expect, it, vi } from "vitest";

import type { HistoricalRaceProvider, ProviderDriverCareer, ProviderRaceResult, ProviderRaceSummary } from "@/lib/f1/providers/contracts";

import { raceQuestionLimits } from "./raceQuestionLimits";
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

const sainzCareer: ProviderDriverCareer = {
  driver: { externalId: "sainz", givenName: "Carlos", familyName: "Sainz", nationality: "Spanish" },
  firstSeason: 2015,
  lastSeason: 2024,
  starts: 3,
  wins: 1,
  podiums: 2,
  results: [
    { season: 2015, round: 1, raceName: "Australian Grand Prix", raceDate: "2015-03-15", position: 9, gridPosition: 8, lapsCompleted: 56, points: 2, status: "Finished", driver: { externalId: "sainz", givenName: "Carlos", familyName: "Sainz", nationality: "Spanish" }, team: { externalId: "toro_rosso", name: "Toro Rosso" }, provenance: abuDhabi2021.provenance },
    { season: 2021, round: 1, raceName: "Bahrain Grand Prix", raceDate: "2021-03-28", position: 8, gridPosition: 8, lapsCompleted: 56, points: 4, status: "Finished", driver: { externalId: "sainz", givenName: "Carlos", familyName: "Sainz", nationality: "Spanish" }, team: { externalId: "ferrari", name: "Ferrari" }, provenance: abuDhabi2021.provenance },
    { season: 2024, round: 3, raceName: "Australian Grand Prix", raceDate: "2024-03-24", position: 1, gridPosition: 2, lapsCompleted: 58, points: 25, status: "Finished", driver: { externalId: "sainz", givenName: "Carlos", familyName: "Sainz", nationality: "Spanish" }, team: { externalId: "ferrari", name: "Ferrari" }, provenance: abuDhabi2021.provenance },
  ],
  provenance: { ...abuDhabi2021.provenance, externalId: "driver:sainz:results" },
};

function provider(overrides: Partial<HistoricalRaceProvider> = {}): HistoricalRaceProvider {
  return {
    listRaces: vi.fn(async () => [abuDhabi2021]),
    getRaceResult: vi.fn(async () => abuDhabiResult),
    getDriverCareer: vi.fn(async (driverId) => driverId === "sainz" ? sainzCareer : null),
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

  it("answers a driver profile and career from structured Jolpica results without web search", async () => {
    const webRetriever = { retrieveF1Web: vi.fn() };
    const result = await new RaceQuestionService(provider(), undefined, undefined, webRetriever).ask({ question: "Who is Carlos Sainz?" });

    expect(result.status).toBe("answered");
    if (result.status !== "answered") return;
    expect(result.answer).toContain("Spanish Formula 1 driver");
    expect(result.answer).toContain("Toro Rosso");
    expect(result.sources).toEqual([expect.objectContaining({ provider: "jolpica" })]);
    expect(webRetriever.retrieveF1Web).not.toHaveBeenCalled();
  });

  it("calculates season-specific driver statistics without treating them as a race lookup", async () => {
    const historical = provider();
    const result = await new RaceQuestionService(historical).ask({ question: "How many races did Carlos Sainz win in 2024?" });

    expect(result.status).toBe("answered");
    if (result.status !== "answered") return;
    expect(result.answer).toContain("1 win");
    expect(result.answer).toContain("in 2024");
    expect(historical.listRaces).not.toHaveBeenCalled();
    expect(historical.getRaceResult).not.toHaveBeenCalled();
  });

  it("uses structured career context but requires sourced web evidence for transfer motives", async () => {
    const webRetriever = {
      retrieveF1Web: vi.fn(async ({ structuredFacts }: { structuredFacts: readonly string[] }) => ({
        answer: "Ferrari confirmed the change; the stated and reported context is separated from interpretation. ([Ferrari](https://www.ferrari.com/example))",
        sources: [{ id: "web:ferrari", provider: "ferrari.com", title: "Ferrari announcement", url: "https://www.ferrari.com/example" }],
        structuredFacts,
      })),
    };
    const result = await new RaceQuestionService(provider(), undefined, undefined, webRetriever).ask({ question: "Why did Carlos Sainz leave Ferrari?" });

    expect(result.status).toBe("answered");
    if (result.status !== "answered") return;
    expect(result.answer).toBe("Ferrari confirmed the change; the stated and reported context is separated from interpretation.");
    expect(webRetriever.retrieveF1Web).toHaveBeenCalledWith(expect.objectContaining({
      structuredFacts: [expect.stringContaining("Carlos Sainz")],
      plan: expect.objectContaining({ needsWebSearch: true }),
    }));
  });

  it("keeps sourced web answers precise enough for the conversation contract", async () => {
    const webRetriever = {
      retrieveF1Web: vi.fn(async () => ({
        answer: `${"A precise F1 fact. ".repeat(150)}This should not survive the answer boundary.`,
        sources: [{ id: "web:ferrari", provider: "ferrari.com", title: "Ferrari announcement", url: "https://www.ferrari.com/example" }],
      })),
    };
    const result = await new RaceQuestionService(provider(), undefined, undefined, webRetriever).ask({
      question: "Why did Carlos Sainz leave Ferrari?",
    });

    expect(result.status).toBe("answered");
    if (result.status !== "answered") return;
    expect(result.answer.length).toBeLessThanOrEqual(raceQuestionLimits.answerCharacters);
    expect(result.answer).toMatch(/…$/);
    expect(result.answer).not.toContain("This should not survive");
  });

  it("uses conversation entity references for a follow-up without guessing from answer text", async () => {
    const result = await new RaceQuestionService(provider()).ask({
      question: "Which teams has he driven for?",
      conversation: [{
        role: "assistant",
        text: "Carlos Sainz is a Spanish F1 driver.",
        entities: [{ type: "DRIVER", query: "Carlos Sainz", name: "Carlos Sainz", externalId: "sainz" }],
      }],
    });

    expect(result.status).toBe("answered");
    if (result.status !== "answered") return;
    expect(result.answer).toContain("Toro Rosso");
    expect(result.answer).toContain("Ferrari");
  });

  it("resolves a contextual media request to existing attributed moment media", async () => {
    const result = await new RaceQuestionService(provider()).ask({
      question: "Show me a video of that overtake",
      conversation: [{
        role: "assistant",
        text: "Verstappen passed Norris late in the 2024 British Grand Prix.",
        entities: [
          { type: "DRIVER", query: "Max Verstappen", name: "Max Verstappen", externalId: "max_verstappen" },
          { type: "RACE", query: "British Grand Prix", name: "2024 British Grand Prix" },
          { type: "SEASON", query: "2024", name: "2024", externalId: "2024" },
        ],
      }],
    });

    expect(result.status).toBe("answered");
    if (result.status !== "answered") return;
    expect(result.answer).toContain("Verstappen powers past Norris for P2");
    expect(result.media).toEqual([expect.objectContaining({
      attribution: "Formula 1",
      url: expect.stringContaining("formula1.com/en/video"),
    })]);
  });
});
