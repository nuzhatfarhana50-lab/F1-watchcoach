import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";

import { ProviderUnavailable } from "@/app/_components/library-states";
import { RaceCard } from "@/app/_components/race-card";
import { RaceCatalogCard } from "@/app/_components/race-catalog-card";
import { SiteHeader } from "@/app/_components/site-header";
import { getRaceCatalogService, getRaceLibraryService } from "@/lib/f1/application/composition";
import { logger } from "@/lib/observability/logger";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Race library",
  description: "Explore historical and current Formula 1 races through normalized provider data and instructive moments.",
};

const currentSeason = new Date().getUTCFullYear();
const seasonSchema = z.coerce.number().int().min(1950).max(currentSeason);
const seasonOptions = Array.from({ length: currentSeason - 1949 }, (_, index) => currentSeason - index);

type RacesPageProps = {
  searchParams: Promise<{ season?: string | string[] }>;
};

export default async function RacesPage({ searchParams }: RacesPageProps) {
  const rawSeason = (await searchParams).season;
  const parsedSeason = seasonSchema.safeParse(Array.isArray(rawSeason) ? rawSeason[0] : rawSeason);
  const selectedSeason = parsedSeason.success ? parsedSeason.data : currentSeason;
  const [catalog, curatedRaces] = await Promise.all([
    (await getRaceCatalogService()).listSeason(selectedSeason),
    (await getRaceLibraryService()).listRaces(),
  ]);

  if (catalog.providerStates.jolpica === "unavailable") {
    logger.warn("Race catalog provider unavailable", { provider: "jolpica", season: selectedSeason });
  }
  if (catalog.providerStates.openf1 === "unavailable") {
    logger.warn("Race timing coverage unavailable", { provider: "openf1", season: selectedSeason });
  }

  const additionalLearningRaces = curatedRaces.filter((race) => race.season !== selectedSeason);

  return (
    <PageFrame>
      <section className="page-heading" aria-labelledby="race-library-title">
        <p className="eyebrow">Race collection</p>
        <h1 id="race-library-title">Every season. Real race records.</h1>
        <p>Jolpica supplies the historical and current calendar. OpenF1 marks races with detailed session and timing coverage, while curated Watchcoach races add evidence-led learning moments.</p>
      </section>

      <section className="catalog-controls" aria-labelledby="season-browser-title">
        <div>
          <p className="section-label">Season browser</p>
          <h2 id="season-browser-title">{selectedSeason} Formula 1 season</h2>
          <p>{catalogSummary(catalog.races.length, catalog.openF1RaceCount, catalog.mode, catalog.providerStates.openf1)}</p>
        </div>
        <form action="/races" method="get" className="season-form">
          <label htmlFor="race-season">Season</label>
          <div>
            <select key={selectedSeason} id="race-season" name="season" defaultValue={selectedSeason}>
              {seasonOptions.map((season) => <option key={season} value={season}>{season}</option>)}
            </select>
            <button type="submit">Load season</button>
          </div>
        </form>
      </section>

      <nav className="season-shortcuts" aria-label="Season shortcuts">
        {[currentSeason, 2024, 2023].filter((season, index, values) => values.indexOf(season) === index).map((season) => (
          <Link key={season} href={`/races?season=${season}`} aria-current={season === selectedSeason ? "page" : undefined}>{season === currentSeason ? `${season} current` : season}</Link>
        ))}
      </nav>

      {catalog.mode === "unavailable" ? (
        <ProviderUnavailable provider="Jolpica" />
      ) : (
        <section className="race-grid" aria-label={`${selectedSeason} races`}>
          {catalog.races.map((race) => <RaceCatalogCard key={race.id} race={race} />)}
        </section>
      )}

      {additionalLearningRaces.length > 0 ? (
        <section className="curated-library" aria-labelledby="learning-races-title">
          <div className="section-heading">
            <p className="section-label">Watch → Learn → Connect</p>
            <h2 id="learning-races-title">Races with curated learning moments</h2>
            <p>These verified race records include evidence, explanation, concepts, and a genuine connection to another moment.</p>
          </div>
          <div className="race-grid" aria-label="Curated learning races">
            {additionalLearningRaces.map((race) => <RaceCard key={race.id} race={race} />)}
          </div>
        </section>
      ) : null}
    </PageFrame>
  );
}

function catalogSummary(
  raceCount: number,
  openF1RaceCount: number,
  mode: "provider" | "fixture" | "unavailable",
  openF1State: "available" | "unavailable" | "unsupported",
): string {
  if (mode === "unavailable") return "The live calendar is temporarily unavailable. Curated learning races remain accessible below.";
  if (mode === "fixture") return `${raceCount} curated race record${raceCount === 1 ? "" : "s"}. Jolpica is temporarily unavailable, so no unverified empty calendar is shown.`;
  if (openF1State === "unsupported") return `${raceCount} rounds from Jolpica. OpenF1 detailed session coverage begins with the 2023 season.`;
  if (openF1State === "unavailable") return `${raceCount} rounds from Jolpica. OpenF1 timing coverage is temporarily unavailable.`;
  return `${raceCount} rounds from Jolpica, with detailed OpenF1 session coverage matched to ${openF1RaceCount}.`;
}

function PageFrame({ children }: { children: React.ReactNode }) {
  return <main id="main-content" className="app-shell"><SiteHeader />{children}</main>;
}
