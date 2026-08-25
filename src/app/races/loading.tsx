import { SiteHeader } from "@/app/_components/site-header";

export default function LoadingRaces() {
  return (
    <main id="main-content" className="app-shell">
      <SiteHeader />
      <div className="loading-shell" role="status"><span aria-hidden="true" /><strong>Loading the race library…</strong></div>
    </main>
  );
}
