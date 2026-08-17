import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main-content" className="error-shell">
      <section className="error-panel">
        <p className="section-label">404 · Off track</p>
        <h1>That page could not be found.</h1>
        <p>The race or moment may not have been added to the library yet.</p>
        <Link href="/">Return home</Link>
      </section>
    </main>
  );
}
