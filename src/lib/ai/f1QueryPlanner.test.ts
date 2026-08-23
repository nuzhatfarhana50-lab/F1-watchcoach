import { describe, expect, it } from "vitest";

import { canonicalRaceFixtures } from "@/lib/f1/fixtures/canonical-races";

import { classifyF1ScopeDeterministically, planF1Query, resolveF1Entities } from "./f1QueryPlanner";

describe("F1 query routing", () => {
  it.each([
    "Who is Carlos Sainz?",
    "What is an undercut?",
    "Who is Adrian Newey?",
    "How do F1 teams make money?",
    "What is CFD in F1?",
    "Why are F1 drivers so fit?",
  ])("accepts the legitimate F1 query: %s", (question) => {
    const entities = resolveF1Entities(question, canonicalRaceFixtures);
    expect(classifyF1ScopeDeterministically(question, entities)).toMatch(/^F1_/);
  });

  it.each([
    "How do I make noodles?",
    "Who won the NBA Finals?",
    "Write me a Python script",
    "What is the capital of Bangladesh?",
    "Give me investment advice",
    "Tell me Adrian Newey's favorite food",
    "How does a normal road-car automatic gearbox work?",
  ])("rejects the unrelated query: %s", (question) => {
    const entities = resolveF1Entities(question, canonicalRaceFixtures);
    expect(classifyF1ScopeDeterministically(question, entities)).toBe("OUT_OF_SCOPE");
  });

  it.each([
    ["Who is Carlos Sainz?", "DRIVER_PROFILE"],
    ["Who won Monaco in 2018?", "RACE_RESULT"],
    ["What happened at the 2024 British Grand Prix?", "RACE_MOMENT"],
    ["How does an F1 floor generate downforce?", "TECHNICAL"],
    ["What are the 2026 engine regulations?", "REGULATIONS"],
    ["Why did Sainz leave Ferrari?", "DRIVER_TRANSFER"],
    ["What is happening with Ferrari this season?", "CURRENT_NEWS"],
    ["How does an F1 team make money?", "BUSINESS"],
    ["Why was Singapore 2008 controversial?", "CONTROVERSY"],
    ["Show me a video of that overtake", "MEDIA"],
  ] as const)("routes %s to %s", (question, expectedIntent) => {
    const entities = resolveF1Entities(question, canonicalRaceFixtures);
    const plan = planF1Query(question, "F1_IN_SCOPE", entities);
    expect(plan.intents).toContain(expectedIntent);
  });

  it("produces multiple intents and explicit retrieval requirements", () => {
    const question = "Why did Carlos Sainz leave Ferrari?";
    const entities = resolveF1Entities(question, canonicalRaceFixtures);
    const plan = planF1Query(question, "F1_IN_SCOPE", entities);

    expect(plan.intents).toEqual(expect.arrayContaining(["DRIVER_TRANSFER", "DRIVER_CAREER"]));
    expect(plan.entities).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "DRIVER", externalId: "sainz" }),
      expect.objectContaining({ type: "TEAM", externalId: "ferrari" }),
    ]));
    expect(plan).toMatchObject({ needsStructuredData: true, needsWebSearch: true });
  });

  it("resolves a follow-up pronoun from bounded conversation references", () => {
    const entities = resolveF1Entities("Which teams has he driven for?", canonicalRaceFixtures, [{
      role: "assistant",
      text: "Carlos Sainz is a Spanish Formula 1 driver.",
      entities: [{ type: "DRIVER", query: "Carlos Sainz", name: "Carlos Sainz", externalId: "sainz" }],
    }]);
    expect(entities).toContainEqual(expect.objectContaining({ type: "DRIVER", externalId: "sainz" }));
  });

  it("keeps supporting context bounded to an established F1 conversation", () => {
    const conversation = [{
      role: "assistant" as const,
      text: "F1 teams use CFD to study airflow around the car.",
      entities: [{ type: "CONCEPT" as const, query: "downforce", name: "Downforce" }],
    }];
    const entities = resolveF1Entities("What is CFD?", canonicalRaceFixtures, conversation);
    expect(classifyF1ScopeDeterministically("What is CFD?", entities, conversation)).toBe("F1_RELATED_CONTEXT");
  });

  it("resolves a one-edit driver typo and routes credentials to structured and web evidence", () => {
    const question = "What are Max Verstapen's qualifications?";
    const entities = resolveF1Entities(question, canonicalRaceFixtures);

    expect(entities).toContainEqual(expect.objectContaining({
      type: "DRIVER",
      name: "Max Verstappen",
      externalId: "max_verstappen",
    }));
    expect(classifyF1ScopeDeterministically(question, entities)).toBe("F1_IN_SCOPE");
    expect(planF1Query(question, "F1_IN_SCOPE", entities)).toMatchObject({
      intents: expect.arrayContaining(["DRIVER_PROFILE", "STATISTICS"]),
      needsStructuredData: true,
      needsWebSearch: true,
    });
  });

  it("defers unfamiliar driver-like names to the optional F1 scope classifier", () => {
    const question = "Tell me about juan manuel fangio";
    const entities = resolveF1Entities(question, canonicalRaceFixtures);
    expect(classifyF1ScopeDeterministically(question, entities)).toBeNull();
  });
});
