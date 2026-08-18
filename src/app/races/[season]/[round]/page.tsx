import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { ProviderUnavailable, UnsupportedSeason } from "@/app/_components/library-states";
import { SiteHeader } from "@/app/_components/site-header";
import { getRaceLibraryService } from "@/lib/f1/application/composition";
import { isProviderFailure } from "@/lib/f1/providers/errors";
import { logger } from "@/lib/observability/logger";

const parametersSchema = z.object({
  season: z.coerce.number().int().min(1950).max(2200),
  round: z.coerce.number().int().positive(),
});

type RacePageProps = { params: Promise<{ season: string; round: string }> };

export async function generateMetadata({ params }: RacePageProps): Promise<Metadata> {
  const parsed = parametersSchema.safeParse(await params);
  if (!parsed.success) return { title: "Race not found" };
  const result = await (await getRaceLibraryService()).getRace(parsed.data.season, parsed.data.round);
  return result.kind === "found"
    ? { title: `${result.race.name} ${result.race.season}`, description: result.race.officialName }
    : { title: `${parsed.data.season} race` };
}

export async function generateStaticParams() {
  const races = await (await getRaceLibraryService()).listRaces();
  return races.map((race) => ({ season: String(race.season), round: String(race.round) }));
}

export default async function RacePage({ params }: RacePageProps) {
  const parsed = parametersSchema.safeParse(await params);
  if (!parsed.success) notFound();

  let result;
  try {
    result = await (await getRaceLibraryService()).getRace(parsed.data.season, parsed.data.round);
  } catch (error) {
    if (isProviderFailure(error)) {
      logger.warn("Race detail provider unavailable", { provider: error.provider, failureKind: error.kind });
      return <PageFrame><ProviderUnavailable provider={error.provider} /></PageFrame>;
    }
    throw error;
  }

  if (result.kind === "unsupported") {
    return <PageFrame><UnsupportedSeason season={result.season} supportedSeasons={result.supportedSeasons} /></PageFrame>;
  }
  if (result.kind === "notFound") notFound();

  const race = result.race;
  return (
    <PageFrame>
      <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/races">Races</Link><span aria-hidden="true">/</span><span>{race.season} · Round {race.round}</span></nav>
      <header className="race-hero">
        <div>
          <p className="eyebrow">{race.season} · Round {race.round}</p>
          <h1>{race.name}</h1>
          <p>{race.circuit.name} · {race.circuit.country}</p>
        </div>
        <dl className="race-facts">
          <div><dt>Status</dt><dd>{race.status}</dd></div>
          <div><dt>Laps</dt><dd>{race.laps ?? "—"}</dd></div>
          <div><dt>Moments</dt><dd>{race.momentCount}</dd></div>
        </dl>
      </header>
      <section className="moments-section" aria-labelledby="moments-title">
        <div className="section-heading"><p className="section-label">Race moments</p><h2 id="moments-title">Where the race changed</h2><p>Structured evidence comes first. Full explanations open in Phase 3.</p></div>
        <ol className="moment-list">
          {race.moments.map((moment, index) => (
            <li key={moment.id} className="moment-card">
              <div className="moment-index">{String(index + 1).padStart(2, "0")}</div>
              <div>
                <div className="moment-meta"><span>{moment.type.replace(/([A-Z])/g, " $1")}</span>{moment.lapNumber ? <span>Lap {moment.lapNumber}</span> : null}<span>{moment.evidenceCount} evidence records</span></div>
                <h3>{moment.title}</h3>
                <p>{moment.summary}</p>
                <div className="concept-row">{moment.concepts.map((concept) => <span key={concept.slug}>{concept.name} · {concept.category}</span>)}</div>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </PageFrame>
  );
}

function PageFrame({ children }: { children: React.ReactNode }) {
  return <main id="main-content" className="app-shell"><SiteHeader />{children}</main>;
}
