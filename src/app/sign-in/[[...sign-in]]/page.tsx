import { redirect } from "next/navigation";

import { GoogleSignIn } from "@/app/_components/google-sign-in";
import { SiteHeader } from "@/app/_components/site-header";
import { isClerkConfigured } from "@/lib/auth/configuration";
import { identityProvider } from "@/lib/auth/identity";

export const dynamic = "force-dynamic";

export default async function SignInPage() {
  const authenticationAvailable = isClerkConfigured();
  if (authenticationAvailable && await identityProvider.currentExternalUserId()) {
    redirect("/learning");
  }

  return (
    <main id="main-content" className="app-shell">
      <SiteHeader />
      <section className="auth-shell" aria-labelledby="sign-in-title">
        <div>
          <p className="section-label">Personal learning memory</p>
          <h1 id="sign-in-title">Pick up where you left off.</h1>
          <p>Race browsing stays public. Sign in only to save progress, concepts, and preferences.</p>
        </div>
        {authenticationAvailable ? <GoogleSignIn /> : (
          <p role="status" className="empty-state">Authentication is not configured in this environment.</p>
        )}
      </section>
    </main>
  );
}
