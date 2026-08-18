import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { SiteHeader } from "@/app/_components/site-header";
import { liveSessionService } from "@/lib/live/composition";

export const dynamic = "force-dynamic";

const parametersSchema = z.object({ sessionKey: z.coerce.number().int().positive() });

export default async function LiveSessionPage({ params }: { params: Promise<{ sessionKey: string }> }) {
  const parsed = parametersSchema.safeParse(await params);
  if (!parsed.success) notFound();
  const result = await liveSessionService.read(parsed.data.sessionKey);

  return (
    <main id="main-content" className="app-shell">
      <SiteHeader />
      <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/races">Races</Link><span aria-hidden="true">/</span><span>Live session</span></nav>
      <header className="moment-hero">
        <div className="moment-hero-meta"><span>Read-only live view</span><span>Session {parsed.data.sessionKey}</span></div>
        <h1>Live race moments</h1>
        <p>Structured timing signals appear here before any teaching layer interprets them.</p>
      </header>
      {result.kind === "unavailable" ? (
        <section className="empty-state" role="status"><h2>Live timing is unavailable.</h2><p>No valid cached state exists. Historical learning remains available.</p></section>
      ) : (
        <section className="moment-list" aria-labelledby="live-moments-title">
          <div><p className="section-label">{result.state.status}</p><h2 id="live-moments-title">Detected structured moments</h2><p>Latest lap: {result.state.latestLap ?? "not reported"} · Updated {new Date(result.state.updatedAt).toLocaleTimeString("en-GB")}</p></div>
          {result.state.moments.length === 0 ? <p role="status">No high-confidence moments detected yet.</p> : result.state.moments.map((moment) => (
            <article key={moment.id} className="race-card"><div><span>{moment.type.replaceAll("_", " ")}</span><span>{Math.round(moment.confidence * 100)}% signal confidence</span></div><h3>{moment.title}</h3><p>{moment.summary}</p></article>
          ))}
        </section>
      )}
    </main>
  );
}
