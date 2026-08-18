import { describe, expect, it } from "vitest";

import { DomainInvariantError } from "./errors";
import { validateFixtureCollection } from "./validateFixtureCollection";
import { canonicalRaceFixtures } from "../fixtures/canonical-races";

describe("validateFixtureCollection", () => {
  it("accepts the sourced canonical races and their temporal history", () => {
    const fixture = validateFixtureCollection(canonicalRaceFixtures);

    expect(fixture.races).toHaveLength(2);
    expect(fixture.moments).toHaveLength(3);
    expect(fixture.pitStops).toHaveLength(4);
    expect(fixture.results).toHaveLength(3);
    expect(fixture.moments.every((moment) => moment.sourceIds.length > 0)).toBe(true);
    expect(fixture.moments.flatMap((moment) => moment.evidence).every((evidence) => evidence.sourceIds.length > 0)).toBe(true);
  });

  it("rejects invalid temporal ranges", () => {
    const fixture = structuredClone(canonicalRaceFixtures);
    fixture.driverTeamMemberships[0].validTo = "2023-01-01";

    expect(() => validateFixtureCollection(fixture)).toThrowError(DomainInvariantError);
    try {
      validateFixtureCollection(fixture);
    } catch (error) {
      expect(error).toMatchObject({ code: "invalidDateRange" });
    }
  });

  it("rejects missing provenance references", () => {
    const fixture = structuredClone(canonicalRaceFixtures);
    fixture.moments[0].sourceIds = ["ffffffff-ffff-4fff-8fff-ffffffffffff"];

    expect(() => validateFixtureCollection(fixture)).toThrowError(expect.objectContaining({ code: "missingReference" }));
  });

  it("rejects a moment attached to the wrong session", () => {
    const fixture = structuredClone(canonicalRaceFixtures);
    fixture.moments[0].sessionId = fixture.sessions[1].id;

    expect(() => validateFixtureCollection(fixture)).toThrowError(expect.objectContaining({ code: "mismatchedRelationship" }));
  });

  it("rejects a championship standing whose target does not match its kind", () => {
    const fixture = structuredClone(canonicalRaceFixtures);
    fixture.championshipStandings.push({
      id: "f0000000-0000-4000-8000-000000000001",
      seasonId: fixture.seasons[0].id,
      afterGrandPrixId: fixture.grandsPrix[0].id,
      kind: "constructor",
      driverId: fixture.drivers[0].id,
      position: 1,
      points: 1,
      wins: 1,
      sourceId: fixture.sources[0].id,
    });

    expect(() => validateFixtureCollection(fixture)).toThrowError(expect.objectContaining({ code: "mismatchedRelationship" }));
  });
});
