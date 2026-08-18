import Link from "next/link";

export function EmptyRaceLibrary() {
  return (
    <section className="state-panel" aria-labelledby="empty-library-title">
      <p className="section-label">No races yet</p>
      <h2 id="empty-library-title">The race library is empty.</h2>
      <p>Validated race fixtures or provider data will appear here after ingestion.</p>
    </section>
  );
}

export function ProviderUnavailable({ provider }: { provider: string }) {
  return (
    <section className="state-panel" role="status" aria-labelledby="provider-unavailable-title">
      <p className="section-label">Data temporarily unavailable</p>
      <h2 id="provider-unavailable-title">The race feed could not be reached.</h2>
      <p>{provider} did not return a usable response. Saved learning content remains unchanged.</p>
      <Link href="/races">Try the library again</Link>
    </section>
  );
}

export function UnsupportedSeason({ season, supportedSeasons }: { season: number; supportedSeasons: readonly number[] }) {
  return (
    <section className="state-panel" aria-labelledby="unsupported-season-title">
      <p className="section-label">Unsupported season</p>
      <h1 id="unsupported-season-title">{season} is not in this library yet.</h1>
      <p>Deterministic coverage currently includes {supportedSeasons.join(" and ")}.</p>
      <Link href="/races">Browse supported races</Link>
    </section>
  );
}
