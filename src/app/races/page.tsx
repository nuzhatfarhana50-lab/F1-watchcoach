import type { Metadata } from "next";

import { EmptyRaceLibrary, ProviderUnavailable } from "@/app/_components/library-states";
import { RaceCard } from "@/app/_components/race-card";
import { SiteHeader } from "@/app/_components/site-header";
import { getRaceLibraryService } from "@/lib/f1/application/composition";
import { isProviderFailure } from "@/lib/f1/providers/errors";
import { logger } from "@/lib/observability/logger";

export const metadata: Metadata = {
  title: "Race library",
  description: "Explore real Formula 1 races through their most instructive moments.",
};

export default async function RacesPage() {
  let races;
  try {
    races = await (await getRaceLibraryService()).listRaces();
  } catch (error) {
    if (isProviderFailure(error)) {
      logger.warn("Race library provider unavailable", { provider: error.provider, failureKind: error.kind });
      return <PageFrame><ProviderUnavailable provider={error.provider} /></PageFrame>;
    }
    throw error;
  }

  return (
    <PageFrame>
      <section className="page-heading" aria-labelledby="race-library-title">
        <p className="eyebrow">Race library</p>
        <h1 id="race-library-title">Start with a race you watched.</h1>
        <p>Open a race to find the moments that changed it, the evidence behind them, and the concepts they teach.</p>
      </section>
      {races.length === 0 ? <EmptyRaceLibrary /> : (
        <section className="race-grid" aria-label="Available races">
          {races.map((race) => <RaceCard key={race.id} race={race} />)}
        </section>
      )}
    </PageFrame>
  );
}

function PageFrame({ children }: { children: React.ReactNode }) {
  return <main id="main-content" className="app-shell"><SiteHeader />{children}</main>;
}
