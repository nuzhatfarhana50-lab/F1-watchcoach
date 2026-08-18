import { SiteHeader } from "@/app/_components/site-header";

export default function LoadingRace() {
  return <main id="main-content" className="app-shell"><SiteHeader /><div className="loading-shell" role="status">Loading race moments…</div></main>;
}
