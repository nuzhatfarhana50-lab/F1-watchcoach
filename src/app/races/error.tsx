"use client";

import { useEffect } from "react";

export default function RaceLibraryError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => reportError(error), [error]);
  return (
    <main id="main-content" className="error-shell">
      <section className="error-panel">
        <p className="section-label">Race library error</p>
        <h2>We could not assemble the race library.</h2>
        <p>The issue was captured. Your saved source data has not been changed.</p>
        <button type="button" onClick={reset}>Try again</button>
      </section>
    </main>
  );
}
