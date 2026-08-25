import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import { notFound } from "next/navigation";

import { isClerkConfigured } from "@/lib/auth/configuration";

export const dynamic = "force-dynamic";

export default function SsoCallbackPage() {
  if (!isClerkConfigured()) notFound();

  return (
    <main id="main-content" className="auth-callback-shell">
      <AuthenticateWithRedirectCallback
        signInForceRedirectUrl="/learning"
        signUpForceRedirectUrl="/learning"
      />
      <p role="status">Completing secure Google sign-in…</p>
    </main>
  );
}
