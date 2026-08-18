import "server-only";

import { canonicalRaceFixtures } from "@/lib/f1/fixtures/canonical-races";
import { InMemoryRaceCatalogRepository } from "@/lib/f1/repositories/inMemoryRaceCatalogRepository";

import { RaceLibraryService } from "./raceLibraryService";

let raceLibrary: Promise<RaceLibraryService> | undefined;

export function getRaceLibraryService(): Promise<RaceLibraryService> {
  raceLibrary ??= createRaceLibraryService();
  return raceLibrary;
}

async function createRaceLibraryService(): Promise<RaceLibraryService> {
  const repository = new InMemoryRaceCatalogRepository();
  await repository.importFixtures(canonicalRaceFixtures);
  return new RaceLibraryService(repository);
}
