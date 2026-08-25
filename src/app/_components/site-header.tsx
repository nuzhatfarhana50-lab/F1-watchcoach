import { Show, UserButton } from "@clerk/nextjs";
import Link from "next/link";

import { isClerkConfigured } from "@/lib/auth/configuration";

export function SiteHeader() {
  const authenticationAvailable = isClerkConfigured();
  return (
    <header className="topbar">
      <Link className="brand" href="/" aria-label="F1 Watchcoach home">
        <span className="brand-mark" aria-hidden="true">W</span>
        <span>F1 Watchcoach</span>
      </Link>
      <nav className="primary-nav" aria-label="Primary navigation">
        <Link href="/races">Races</Link>
        {authenticationAvailable ? (
          <>
            <Show when="signed-out"><Link href="/sign-in">Sign in</Link></Show>
            <Show when="signed-in"><Link href="/learning">Learning</Link></Show>
            <Show when="signed-in">
              <span className="auth-user-control">
                <UserButton signInUrl="/sign-in" />
              </span>
            </Show>
          </>
        ) : null}
        <span className="phase-badge">Watch · Learn · Connect</span>
      </nav>
    </header>
  );
}
