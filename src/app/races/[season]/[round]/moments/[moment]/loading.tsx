import { SiteHeader } from "@/app/_components/site-header";

export default function LoadingMoment() {
  return <main id="main-content" className="app-shell"><SiteHeader /><div className="loading-shell" role="status">Loading evidence and explanation…</div></main>;
}
