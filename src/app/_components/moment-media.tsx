import type { MomentDetailReadModel } from "@/lib/f1/application/raceLibraryService";

export function MomentMedia({ media }: { media: MomentDetailReadModel["media"] }) {
  return (
    <section className="media-panel" aria-labelledby="media-title">
      <div>
        <p className="section-label">Media reference</p>
        <h2 id="media-title">Watch from the rights holder.</h2>
      </div>
      {media.length > 0 ? (
        <ul>
          {media.map((item) => (
            <li key={item.id}>
              <div><span>{item.kind}</span><strong>{item.title}</strong><small>Source: {item.attribution}</small></div>
              <a href={item.url} target="_blank" rel="noreferrer">Open official media <span aria-hidden="true">↗</span></a>
            </li>
          ))}
        </ul>
      ) : (
        <div className="inline-state" role="status">
          <strong>No embeddable media is available.</strong>
          <p>The structured race evidence and attributed sources remain available below.</p>
        </div>
      )}
    </section>
  );
}
