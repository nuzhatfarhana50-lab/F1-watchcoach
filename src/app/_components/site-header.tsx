import Link from "next/link";

export function SiteHeader() {
  const authenticationAvailable = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  return (
    <header className="topbar">
      <Link className="brand" href="/" aria-label="F1 Watchcoach home">
        <span className="brand-mark" aria-hidden="true">W</span>
        <span>F1 Watchcoach</span>
      </Link>
      <nav className="primary-nav" aria-label="Primary navigation">
        <Link href="/races">Races</Link>
        {authenticationAvailable ? <Link href="/sign-in">Sign in</Link> : null}
        <span className="phase-badge">Watch · Learn · Connect</span>
      </nav>
    </header>
  );
}
