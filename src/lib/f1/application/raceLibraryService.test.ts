import { beforeEach, describe, expect, it } from "vitest";

import { canonicalRaceFixtures } from "@/lib/f1/fixtures/canonical-races";
import { InMemoryRaceCatalogRepository } from "@/lib/f1/repositories/inMemoryRaceCatalogRepository";

import { RaceLibraryService } from "./raceLibraryService";

describe("RaceLibraryService", () => {
  let service: RaceLibraryService;

  beforeEach(async () => {
    const repository = new InMemoryRaceCatalogRepository();
    await repository.importFixtures(canonicalRaceFixtures);
    service = new RaceLibraryService(repository);
  });

  it("builds a serializable reverse-chronological catalog", async () => {
    const races = await service.listRaces();
    expect(races.map((race) => race.name)).toEqual(["British Grand Prix", "Dutch Grand Prix"]);
    expect(races[0]).toMatchObject({ href: "/races/2024/12", momentCount: 2, circuit: { name: "Silverstone Circuit" } });
  });

  it("distinguishes unsupported fixture coverage from a missing round", async () => {
    await expect(service.getRace(2022, 1)).resolves.toMatchObject({ kind: "unsupported", season: 2022 });
    await expect(service.getRace(2024, 99)).resolves.toEqual({ kind: "notFound" });
  });

  it("returns evidence-led moment previews", async () => {
    const result = await service.getRace(2024, 12);
    expect(result.kind).toBe("found");
    if (result.kind === "found") {
      expect(result.race.moments[0]).toMatchObject({
        title: "Hamilton times the switch back to slicks",
        evidenceCount: 2,
        concepts: [{ name: "Pit window" }],
      });
    }
  });
});
