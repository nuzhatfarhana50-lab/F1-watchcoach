import { describe, expect, it } from "vitest";

import { DomainInvariantError } from "@/lib/f1/domain/errors";
import { canonicalRaceFixtures } from "@/lib/f1/fixtures/canonical-races";

import { InMemoryRaceCatalogRepository } from "./inMemoryRaceCatalogRepository";

describe("InMemoryRaceCatalogRepository", () => {
  it("imports canonical fixtures idempotently", async () => {
    const repository = new InMemoryRaceCatalogRepository();

    await expect(repository.importFixtures(canonicalRaceFixtures)).resolves.toEqual({ inserted: 1, unchanged: 0 });
    await expect(repository.importFixtures(canonicalRaceFixtures)).resolves.toEqual({ inserted: 0, unchanged: 1 });
    await expect(repository.listRaces()).resolves.toHaveLength(2);
  });

  it("returns the anchor race with ordered moments", async () => {
    const repository = new InMemoryRaceCatalogRepository();
    await repository.importFixtures(canonicalRaceFixtures);

    const entry = await repository.findRace(2024, 12);
    expect(entry?.grandPrix.shortName).toBe("British Grand Prix");
    expect(entry?.moments.map((moment) => moment.sequence)).toEqual([1, 2]);
  });

  it("rejects an external identifier reassigned to another entity", async () => {
    const repository = new InMemoryRaceCatalogRepository();
    await repository.importFixtures(canonicalRaceFixtures);
    const conflicting = structuredClone(canonicalRaceFixtures);
    conflicting.externalReferences[0].entityId = conflicting.races[1].id;

    await expect(repository.importFixtures(conflicting)).rejects.toBeInstanceOf(DomainInvariantError);
  });
});
