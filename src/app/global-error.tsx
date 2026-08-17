"use client";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <main id="main-content" className="error-shell">
          <section className="error-panel">
            <h1>F1 Watchcoach is temporarily unavailable.</h1>
            <p>Please try once more. No learning progress has been changed.</p>
            <button type="button" onClick={reset}>
              Reload application
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
