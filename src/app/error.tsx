"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error);
  }, [error]);

  return (
    <main id="main-content" className="error-shell">
      <section className="error-panel">
        <p className="section-label">Application error</p>
        <h2>We could not load this view.</h2>
        <p>Try again. If the problem continues, the failure has been captured.</p>
        <button type="button" onClick={reset}>
          Try again
        </button>
      </section>
    </main>
  );
}
