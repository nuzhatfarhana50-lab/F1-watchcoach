import { SignIn } from "@clerk/nextjs";

import { SiteHeader } from "@/app/_components/site-header";
import { isClerkConfigured } from "@/lib/auth/configuration";

export default function SignInPage() {
  return (
    <main id="main-content" className="app-shell">
      <SiteHeader />
      <section className="auth-shell" aria-labelledby="sign-in-title">
        <div>
          <p className="section-label">Personal learning memory</p>
          <h1 id="sign-in-title">Pick up where you left off.</h1>
          <p>Race browsing stays public. Sign in only to save progress, concepts, and preferences.</p>
        </div>
        {isClerkConfigured() ? <SignIn routing="path" path="/sign-in" /> : (
          <p role="status" className="empty-state">Authentication is not configured in this environment.</p>
        )}
      </section>
    </main>
  );
}
