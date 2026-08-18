import Link from "next/link";

import { SiteHeader } from "./_components/site-header";

export default function Home() {
  return (
    <main id="main-content" className="app-shell">
      <SiteHeader />

      <section className="hero" aria-labelledby="hero-title">
        <div className="eyebrow">Watch → Learn → Connect</div>
        <h1 id="hero-title">Understand the race you just watched.</h1>
        <p>
          F1 Watchcoach starts with real race moments, shows the evidence, and
          teaches you what to notice next time.
        </p>
        <div
          className="hero-actions"
          role="group"
          aria-label="Current project status"
        >
          <Link className="primary-action" href="/races">Browse the race library</Link>
          <span className="status-dot">
            <span aria-hidden="true" /> Deterministic race data active
          </span>
        </div>
      </section>

      <section className="product-loop" aria-labelledby="loop-title">
        <div>
          <p className="section-label">The learning loop</p>
          <h2 id="loop-title">Evidence first. Explanation in context.</h2>
        </div>
        <ol>
          <li>
            <span>01</span>
            <strong>Watch</strong>
            <p>Start from a real race moment and the data or media behind it.</p>
          </li>
          <li>
            <span>02</span>
            <strong>Learn</strong>
            <p>Understand what happened, why it happened, and why it mattered.</p>
          </li>
          <li>
            <span>03</span>
            <strong>Connect</strong>
            <p>Recognize the concept when it appears in another race.</p>
          </li>
        </ol>
      </section>
    </main>
  );
}
