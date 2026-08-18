import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { MomentConnections } from "@/app/_components/moment-connections";
import { MomentEvidence } from "@/app/_components/moment-evidence";
import { MomentLearning } from "@/app/_components/moment-learning";
import { MomentMedia } from "@/app/_components/moment-media";
import { ProviderUnavailable, UnsupportedSeason } from "@/app/_components/library-states";
import { SiteHeader } from "@/app/_components/site-header";
import { SaveLearningControl } from "@/app/_components/save-learning-control";
import { isClerkConfigured } from "@/lib/auth/configuration";
import { getRaceLibraryService } from "@/lib/f1/application/composition";
import { isProviderFailure } from "@/lib/f1/providers/errors";
import { logger } from "@/lib/observability/logger";

const parametersSchema = z.object({
  season: z.coerce.number().int().min(1950).max(2200),
  round: z.coerce.number().int().positive(),
  moment: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});

type MomentPageProps = { params: Promise<{ season: string; round: string; moment: string }> };

export async function generateMetadata({ params }: MomentPageProps): Promise<Metadata> {
  const parsed = parametersSchema.safeParse(await params);
  if (!parsed.success) return { title: "Moment not found" };
  const result = await (await getRaceLibraryService()).getMoment(parsed.data.season, parsed.data.round, parsed.data.moment);
  return result.kind === "found"
    ? { title: result.moment.title, description: result.moment.summary }
    : { title: "Moment not found" };
}

export async function generateStaticParams() {
  const service = await getRaceLibraryService();
  const races = await service.listRaces();
  const details = await Promise.all(races.map((race) => service.getRace(race.season, race.round)));
  return details.flatMap((result) => result.kind === "found"
    ? result.race.moments.map((moment) => ({ season: String(result.race.season), round: String(result.race.round), moment: moment.slug }))
    : []);
}

export default async function MomentPage({ params }: MomentPageProps) {
  const parsed = parametersSchema.safeParse(await params);
  if (!parsed.success) notFound();

  let result;
  try {
    result = await (await getRaceLibraryService()).getMoment(parsed.data.season, parsed.data.round, parsed.data.moment);
  } catch (error) {
    if (isProviderFailure(error)) {
      logger.warn("Moment provider unavailable", { provider: error.provider, failureKind: error.kind });
      return <PageFrame><ProviderUnavailable provider={error.provider} /></PageFrame>;
    }
    throw error;
  }
  if (result.kind === "unsupported") return <PageFrame><UnsupportedSeason season={result.season} supportedSeasons={result.supportedSeasons} /></PageFrame>;
  if (result.kind === "notFound") notFound();

  const moment = result.moment;
  return (
    <PageFrame>
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/races">Races</Link><span aria-hidden="true">/</span>
        <Link href={moment.race.href}>{moment.race.name}</Link><span aria-hidden="true">/</span>
        <span>Moment</span>
      </nav>
      <header className="moment-hero">
        <div className="moment-hero-meta"><span>{moment.type.replace(/([A-Z])/g, " $1")}</span>{moment.lapNumber ? <span>Lap {moment.lapNumber}</span> : null}<span>{moment.race.season} {moment.race.name}</span></div>
        <h1>{moment.title}</h1>
        <p>{moment.summary}</p>
        <div className="participant-row" aria-label="Participants">
          {moment.drivers.map((driver) => <span key={driver.id}>{driver.name}</span>)}
          {moment.teams.map((team) => <span key={team.id}>{team.name}</span>)}
        </div>
      </header>
      <MomentMedia media={moment.media} />
      <MomentEvidence moment={moment} />
      <MomentLearning moment={moment} />
      <MomentConnections connections={moment.connections} />
      <section className="sources-section" aria-labelledby="sources-title">
        <div><p className="section-label">Sources</p><h2 id="sources-title">Trace the claims.</h2></div>
        <ol>{moment.sources.map((source) => <li key={source.id}><span>{source.provider}</span><a href={source.url} target="_blank" rel="noreferrer">{source.title} <span aria-hidden="true">↗</span></a></li>)}</ol>
      </section>
      {isClerkConfigured() && moment.concepts[0] ? (
        <SaveLearningControl
          raceId={moment.race.id}
          momentId={moment.id}
          conceptId={moment.concepts[0].id}
          returnPath={`/races/${parsed.data.season}/${parsed.data.round}/moments/${parsed.data.moment}`}
        />
      ) : (
        <aside className="save-prompt" aria-label="Saving availability"><div><strong>Want to remember this concept?</strong><p>Public learning is ready. Configure Clerk to save personal progress.</p></div><span aria-disabled="true">Saving unavailable</span></aside>
      )}
    </PageFrame>
  );
}

function PageFrame({ children }: { children: React.ReactNode }) {
  return <main id="main-content" className="app-shell"><SiteHeader />{children}</main>;
}
