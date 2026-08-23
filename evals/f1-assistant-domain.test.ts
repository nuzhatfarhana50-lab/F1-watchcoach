import { describe, expect, it, vi } from "vitest";

import {
  classifyF1ScopeDeterministically,
  planF1Query,
  resolveF1Entities,
  resolveProviderDriverEntities,
  shouldResolveDriverDirectory,
} from "@/lib/ai/f1QueryPlanner";
import { RaceQuestionService } from "@/lib/ai/raceQuestionService";
import { canonicalRaceFixtures } from "@/lib/f1/fixtures/canonical-races";
import type { HistoricalRaceProvider } from "@/lib/f1/providers/contracts";

const provider: HistoricalRaceProvider = {
  listRaces: vi.fn(async () => []),
  getRaceResult: vi.fn(async () => null),
};

describe("Universal F1 assistant evaluation", () => {
  it("achieves full deterministic scope recall on the representative F1 domain set", () => {
    const questions = [
      "Who is Carlos Sainz?",
      "What are Max Verstapen's qualifications?",
      "What is Ferrari's history?",
      "Who won Monaco in 2018?",
      "How many races did Hamilton win in 2020?",
      "What happened in Abu Dhabi 2021?",
      "What is an undercut?",
      "Why does dirty air matter?",
      "How does an F1 floor generate downforce?",
      "How does energy recovery work in F1?",
      "What are the 2026 engine regulations?",
      "What does the FIA do in F1?",
      "How does an F1 team make money?",
      "Why did Hamilton move to Ferrari?",
      "What happened between Senna and Prost?",
      "Why was Singapore 2008 controversial?",
      "Where is Silverstone?",
      "Who won the 2012 championship?",
      "Show me a video of the 2024 British Grand Prix overtake",
      "Who leads the F1 championship right now?",
    ];
    const classifications = questions.map((question) => {
      const entities = resolveF1Entities(question, canonicalRaceFixtures);
      return classifyF1ScopeDeterministically(question, entities);
    });
    expect(classifications.every((scope) => scope === "F1_IN_SCOPE" || scope === "F1_RELATED_CONTEXT")).toBe(true);
  });

  it("achieves full non-F1 rejection on the adversarial set", async () => {
    const listRaces = vi.fn(async () => []);
    const getRaceResult = vi.fn(async () => null);
    const service = new RaceQuestionService({ listRaces, getRaceResult });
    const questions = [
      "How do I make noodles?",
      "Write Python code for sorting an array.",
      "What is the capital of Bangladesh?",
      "Who won the NBA Finals?",
      "Give me investment advice.",
      "Tell me Adrian Newey's favorite food.",
      "Explain Aramco's entire oil business.",
    ];
    const results = await Promise.all(questions.map((question) => service.ask({ question })));
    expect(results.every((result) => result.status === "blocked")).toBe(true);
    expect(listRaces).not.toHaveBeenCalled();
    expect(getRaceResult).not.toHaveBeenCalled();
  });

  it("resolves representative historical drivers beyond the curated alias table", () => {
    const drivers = [
      { externalId: "fangio", givenName: "Juan Manuel", familyName: "Fangio" },
      { externalId: "clark", givenName: "Jim", familyName: "Clark" },
      { externalId: "stewart", givenName: "Jackie", familyName: "Stewart" },
      { externalId: "hill", givenName: "Graham", familyName: "Hill" },
      { externalId: "villeneuve", givenName: "Gilles", familyName: "Villeneuve" },
    ];
    const questions = [
      "Tell me about Juan Manuel Fangio",
      "How many races did Jim Clark win?",
      "Who was Jackie Stewart?",
      "What was Graham Hill's F1 career?",
      "What is Gilles Villeneuve's history?",
    ];

    for (const question of questions) {
      const localEntities = resolveF1Entities(question, canonicalRaceFixtures);
      expect(shouldResolveDriverDirectory(question, localEntities), question).toBe(true);
      const providerEntities = resolveProviderDriverEntities(question, drivers);
      expect(providerEntities, question).toHaveLength(1);
      expect(classifyF1ScopeDeterministically(question, providerEntities), question).toBe("F1_IN_SCOPE");
    }
  });

  it("marks every narrative/current category for web evidence while keeping structured results direct", () => {
    const cases = [
      ["Why did Sainz leave Ferrari?", true],
      ["Why was Singapore 2008 controversial?", true],
      ["What are the 2026 engine regulations?", true],
      ["How do F1 teams make money?", true],
      ["Who leads the F1 championship right now?", true],
      ["Who won Monaco in 2018?", false],
    ] as const;
    for (const [question, needsWebSearch] of cases) {
      const entities = resolveF1Entities(question, canonicalRaceFixtures);
      const plan = planF1Query(question, "F1_IN_SCOPE", entities);
      expect(plan.needsWebSearch, question).toBe(needsWebSearch);
    }
  });

  it("keeps canonical structured answers attributed and free of unsupported language", async () => {
    const result = await new RaceQuestionService(provider).ask({ question: "Who won the 2024 British Grand Prix?" });
    expect(result.status).toBe("answered");
    if (result.status !== "answered") return;
    expect(result.answer).toContain("Lewis Hamilton won");
    expect(result.answer).not.toMatch(/I think|probably|according to my memory|reportedly/i);
    expect(result.sources.every((source) => source.url.startsWith("https://"))).toBe(true);
  });
});
