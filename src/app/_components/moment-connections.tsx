import Link from "next/link";

import type { MomentDetailReadModel } from "@/lib/f1/application/raceLibraryService";

export function MomentConnections({ connections }: { connections: MomentDetailReadModel["connections"] }) {
  return (
    <section className="detail-section connect-section" aria-labelledby="connect-title">
      <header className="detail-section-heading">
        <p className="section-label">Connect · Real moment</p>
        <h2 id="connect-title">Recognize the same calculation elsewhere.</h2>
      </header>
      {connections.length > 0 ? (
        <div className="connection-list">
          {connections.map((connection) => (
            <Link className="connection-card" href={connection.href} key={connection.id}>
              <span>{formatReason(connection.reason)} · {connection.targetRaceName}</span>
              <h3>{connection.targetTitle}</h3>
              <p>{connection.explanation}</p>
              <strong>Open connected moment <span aria-hidden="true">→</span></strong>
            </Link>
          ))}
        </div>
      ) : (
        <div className="inline-state"><strong>No verified connection yet.</strong><p>Connections appear only when a real explanatory parallel has been curated.</p></div>
      )}
    </section>
  );
}

function formatReason(reason: string): string {
  return reason.replace(/([A-Z])/g, " $1").toLowerCase();
}
