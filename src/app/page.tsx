import Link from "next/link";

import { RaceQuestionChat } from "./_components/race-question-chat";
import { SiteHeader } from "./_components/site-header";

export default function Home() {
  return (
    <main id="main-content" className="app-shell">
      <SiteHeader />

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
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
        </div>
        <div className="hero-visual" aria-hidden="true">
          <span className="hero-visual-index">01</span>
          <div className="hero-visual-grid">
            {Array.from({ length: 7 }, (_, index) => <i key={index} />)}
          </div>
          <svg viewBox="0 0 520 460" role="presentation" focusable="false">
            <path d="M24 388 C112 352 96 240 194 266 C300 294 314 132 492 82" />
            <path className="hero-trace-accent" d="M52 430 L158 356 L218 370 L304 214 L470 132" />
          </svg>
        </div>
      </section>

      <RaceQuestionChat />

      <section className="product-loop" aria-labelledby="loop-title">
        <div>
          <p className="section-label">The learning loop</p>
          <h2 id="loop-title">Evidence first. Explanation in context.</h2>
        </div>
        <ol>
          <li data-stage="watch">
            <span>01</span>
            <strong>Watch</strong>
            <p>Start from a real race moment and the data or media behind it.</p>
          </li>
          <li data-stage="learn">
            <span>02</span>
            <strong>Learn</strong>
            <p>Understand what happened, why it happened, and why it mattered.</p>
          </li>
          <li data-stage="connect">
            <span>03</span>
            <strong>Connect</strong>
            <p>Recognize the concept when it appears in another race.</p>
          </li>
        </ol>
      </section>
    </main>
  );
}
