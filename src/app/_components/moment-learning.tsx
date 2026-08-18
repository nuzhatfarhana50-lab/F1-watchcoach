import type { MomentDetailReadModel } from "@/lib/f1/application/raceLibraryService";

export function MomentLearning({ moment }: { moment: MomentDetailReadModel }) {
  const explanation = moment.explanation;
  return (
    <section className="detail-section learn-section" aria-labelledby="learn-title">
      <header className="detail-section-heading">
        <p className="section-label">Learn · Explanation</p>
        <h2 id="learn-title">Read the race before the terminology.</h2>
      </header>
      <div className="explanation-grid">
        <ExplanationBlock index="01" title="What happened" body={explanation.whatHappened} />
        <ExplanationBlock index="02" title="Why it happened" body={explanation.whyItHappened} />
        <ExplanationBlock index="03" title="Why it mattered" body={explanation.whyItMatters} />
        <ExplanationBlock index="04" title="What to notice next time" body={explanation.watchNext} />
      </div>
      <div className="concept-list" aria-label="Concepts demonstrated">
        {moment.concepts.map((concept) => (
          <article key={concept.id} className="concept-detail">
            <div><span>{concept.category}</span><h3>{concept.name}</h3></div>
            <p>{concept.definition}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function ExplanationBlock({ index, title, body }: { index: string; title: string; body: string }) {
  return <article className="explanation-block"><span>{index}</span><h3>{title}</h3><p>{body}</p></article>;
}
