import "server-only";

import { canonicalRaceFixtures } from "@/lib/f1/fixtures/canonical-races";
import { f1Providers } from "@/lib/f1/providers/composition";
import { InMemoryRaceCatalogRepository } from "@/lib/f1/repositories/inMemoryRaceCatalogRepository";

import { RaceCatalogService } from "./raceCatalogService";
import { RaceLibraryService } from "./raceLibraryService";

let raceLibrary: Promise<RaceLibraryService> | undefined;
let raceCatalog: Promise<RaceCatalogService> | undefined;

export function getRaceLibraryService(): Promise<RaceLibraryService> {
  raceLibrary ??= createRaceLibraryService();
  return raceLibrary;
}

export function getRaceCatalogService(): Promise<RaceCatalogService> {
  raceCatalog ??= createRaceCatalogService();
  return raceCatalog;
}

async function createRaceLibraryService(): Promise<RaceLibraryService> {
  const repository = new InMemoryRaceCatalogRepository();
  await repository.importFixtures(canonicalRaceFixtures);
  return new RaceLibraryService(repository);
}

async function createRaceCatalogService(): Promise<RaceCatalogService> {
  return new RaceCatalogService(
    f1Providers.historical,
    f1Providers.recent,
    await getRaceLibraryService(),
  );
}
