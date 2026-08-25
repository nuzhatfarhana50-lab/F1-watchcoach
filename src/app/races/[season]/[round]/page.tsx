import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { ProviderUnavailable } from "@/app/_components/library-states";
import { SiteHeader } from "@/app/_components/site-header";
import { getRaceCatalogService, getRaceLibraryService } from "@/lib/f1/application/composition";
import type { ProviderRaceDetail } from "@/lib/f1/application/raceCatalogService";
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
  if (result.kind === "found") {
    return { title: `${result.race.name} ${result.race.season}`, description: result.race.officialName };
  }
  const providerResult = await (await getRaceCatalogService()).getRaceDetail(parsed.data.season, parsed.data.round);
  return providerResult.kind === "found"
    ? { title: `${providerResult.detail.race.name} ${providerResult.detail.race.season}`, description: providerResult.detail.race.officialName }
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

  if (result.kind !== "found") {
    const providerResult = await (await getRaceCatalogService()).getRaceDetail(parsed.data.season, parsed.data.round);
    if (providerResult.kind === "unavailable") return <PageFrame><ProviderUnavailable provider="Jolpica" /></PageFrame>;
    if (providerResult.kind === "notFound") notFound();
    return <ProviderRacePage detail={providerResult.detail} />;
  }

  const race = result.race;
  return (
    <PageFrame>
      <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/races">Races</Link><span aria-hidden="true">/</span><span>{race.season} · Round {race.round}</span></nav>
      <header className="race-hero" data-round={String(race.round).padStart(2, "0")}>
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
            <li key={moment.id} className="moment-card" data-lap={moment.lapNumber ?? undefined} data-type={moment.type}>
              <div className="moment-index">{String(index + 1).padStart(2, "0")}</div>
              <div>
                <div className="moment-meta"><span>{moment.type.replace(/([A-Z])/g, " $1")}</span>{moment.lapNumber ? <span>Lap {moment.lapNumber}</span> : null}<span>{moment.evidenceCount} evidence records</span></div>
                <h3>{moment.title}</h3>
                <p>{moment.summary}</p>
                <div className="concept-row">{moment.concepts.map((concept) => <span key={concept.slug}>{concept.name} · {concept.category}</span>)}</div>
                <Link className="moment-link" href={`/races/${race.season}/${race.round}/moments/${moment.slug}`}>Explore evidence and explanation <span aria-hidden="true">→</span></Link>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </PageFrame>
  );
}

function ProviderRacePage({ detail }: { detail: ProviderRaceDetail }) {
  const race = detail.race;
  const sources = [...race.sources, ...(detail.resultSource ? [detail.resultSource] : [])]
    .filter((source, index, all) => all.findIndex((candidate) => candidate.url === source.url && candidate.label === source.label) === index);

  return (
    <PageFrame>
      <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href={`/races?season=${race.season}`}>Races</Link><span aria-hidden="true">/</span><span>{race.season} · Round {race.round}</span></nav>
      <header className="race-hero" data-round={String(race.round).padStart(2, "0")}>
        <div>
          <p className="eyebrow">{race.season} · Round {race.round}</p>
          <h1>{race.name}</h1>
          <p>{race.circuit.name} · {race.circuit.country}</p>
        </div>
        <dl className="race-facts">
          <div><dt>Status</dt><dd>{race.status}</dd></div>
          <div><dt>Timing</dt><dd>{race.coverage.timing ? "OpenF1" : "Not indexed"}</dd></div>
          <div><dt>Learning</dt><dd>Catalog record</dd></div>
        </dl>
      </header>

      <section className="provider-detail" aria-labelledby="classification-title">
        <div className="section-heading">
          <p className="section-label">Jolpica race record</p>
          <h2 id="classification-title">Classification</h2>
          <p>Provider facts are normalized at the server boundary and retain their source URLs. Race-specific teaching moments appear only after evidence-led curation.</p>
        </div>
        {detail.classificationState === "available" ? (
          <div className="classification-table-wrap">
            <table className="classification-table">
              <thead><tr><th scope="col">Pos</th><th scope="col">Driver</th><th scope="col">Team</th><th scope="col">Grid</th><th scope="col">Laps</th><th scope="col">Points</th></tr></thead>
              <tbody>
                {detail.classification.map((row) => (
                  <tr key={`${row.position ?? "nc"}:${row.driverName}`}>
                    <td>{row.position ?? "NC"}</td><th scope="row">{row.driverName}</th><td>{row.teamName}</td><td>{row.gridPosition}</td><td>{row.lapsCompleted}</td><td>{row.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="inline-state" role="status">
            <strong>{detail.classificationState === "notPublished" ? "Classification not published" : "Classification temporarily unavailable"}</strong>
            <p>{detail.classificationState === "notPublished" ? "This race is scheduled or Jolpica has not published a result yet." : "The calendar record is available, but its result request could not be completed."}</p>
          </div>
        )}
      </section>

      <section className="sources-section" aria-labelledby="provider-sources-title">
        <div><p className="section-label">Provenance</p><h2 id="provider-sources-title">Connected data sources</h2></div>
        <ul className="source-list">
          {sources.map((source) => (
            <li key={`${source.provider}:${source.label}:${source.url ?? "fixture"}`}>
              <span>{source.provider === "openf1" ? "OpenF1" : source.provider === "jolpica" ? "Jolpica" : "Watchcoach"}</span>
              {source.url ? <a href={source.url} target="_blank" rel="noreferrer">{source.label} <span aria-hidden="true">↗</span></a> : <strong>{source.label}</strong>}
            </li>
          ))}
        </ul>
      </section>
    </PageFrame>
  );
}

function PageFrame({ children }: { children: React.ReactNode }) {
  return <main id="main-content" className="app-shell"><SiteHeader />{children}</main>;
}
