import Link from "next/link";

import type { RaceCatalogItem } from "@/lib/f1/application/raceCatalogService";

const dateFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function RaceCatalogCard({ race }: { race: RaceCatalogItem }) {
  const providerLabels = race.sources
    .filter((source) => source.provider !== "watchcoach")
    .map((source) => source.provider === "openf1" ? "OpenF1" : "Jolpica");

  return (
    <article className="race-card race-catalog-card">
      <Link href={race.href} aria-label={`Open ${race.name} ${race.season}`}>
        <div className="race-card-kicker">
          <span>{race.season} · Round {race.round}</span>
          <span className={`status-pill status-${race.status}`}>{race.status}</span>
        </div>
        <h2>{race.name}</h2>
        <p>{race.circuit.name} · {race.circuit.country}</p>
        <div className="coverage-row" aria-label="Data coverage">
          <span>Calendar</span>
          {race.coverage.timing ? <span>Timing</span> : null}
          {race.coverage.learning ? <span>Learning moments</span> : null}
        </div>
        <dl className="race-card-data">
          <div><dt>Date</dt><dd><time dateTime={race.date}>{dateFormatter.format(new Date(`${race.date}T00:00:00Z`))}</time></dd></div>
          <div><dt>Sources</dt><dd>{providerLabels.join(" + ") || "Fixture"}</dd></div>
          <div><dt>Learning</dt><dd>{race.momentCount > 0 ? `${race.momentCount} moments` : "Catalog only"}</dd></div>
        </dl>
        <span className="text-link">Open race record <span aria-hidden="true">→</span></span>
      </Link>
    </article>
  );
}
