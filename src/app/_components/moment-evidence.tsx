import type { MomentDetailReadModel } from "@/lib/f1/application/raceLibraryService";

export function MomentEvidence({ moment }: { moment: MomentDetailReadModel }) {
  return (
    <section className="detail-section watch-section" aria-labelledby="watch-title">
      <header className="detail-section-heading">
        <p className="section-label">Watch · Evidence</p>
        <h2 id="watch-title">Start with what happened on track.</h2>
        <p>These records are structured race evidence, not generated narration.</p>
      </header>
      <div className="evidence-layout">
        <div className="evidence-stack">
          {moment.evidence.length > 0 ? moment.evidence.map((evidence) => (
            <article className="evidence-row" key={evidence.id}>
              <span className="evidence-type">{evidence.type.replace(/([A-Z])/g, " $1")}</span>
              <h3>{evidence.label}</h3>
              <p>{evidence.detail}</p>
            </article>
          )) : <EvidenceUnavailable />}
        </div>
        <aside className="telemetry-state" aria-label="Telemetry availability">
          <span className={moment.telemetryAvailable ? "availability-dot available" : "availability-dot"} aria-hidden="true" />
          <div>
            <strong>{moment.telemetryAvailable ? "Telemetry available" : "Telemetry not available"}</strong>
            <p>{moment.telemetryAvailable ? "Car data is included in this evidence set." : "The explanation uses timing and race records only; no telemetry is inferred."}</p>
          </div>
        </aside>
      </div>
    </section>
  );
}

function EvidenceUnavailable() {
  return (
    <div className="inline-state" role="status">
      <strong>Structured evidence is incomplete.</strong>
      <p>This moment remains visible, but conclusions should wait until timing or race-control records are available.</p>
    </div>
  );
}
