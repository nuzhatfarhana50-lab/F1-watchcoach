import Link from "next/link";

import type { RaceLibraryItem } from "@/lib/f1/application/raceLibraryService";

const dateFormatter = new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export function RaceCard({ race }: { race: RaceLibraryItem }) {
  return (
    <article className="race-card" data-round={String(race.round).padStart(2, "0")} data-status={race.status}>
      <Link href={race.href} aria-label={`Open ${race.name} ${race.season}`}>
        <div className="race-card-kicker">
          <span>{race.season} · Round {race.round}</span>
          <span className={`status-pill status-${race.status}`}>{race.status}</span>
        </div>
        <h2>{race.name}</h2>
        <p>{race.circuit.name} · {race.circuit.country}</p>
        <dl className="race-card-data">
          <div><dt>Date</dt><dd><time dateTime={race.date}>{dateFormatter.format(new Date(`${race.date}T00:00:00Z`))}</time></dd></div>
          <div><dt>Laps</dt><dd>{race.laps ?? "—"}</dd></div>
          <div><dt>Learning moments</dt><dd>{race.momentCount}</dd></div>
        </dl>
        <span className="text-link">Open race <span aria-hidden="true">→</span></span>
      </Link>
    </article>
  );
}
