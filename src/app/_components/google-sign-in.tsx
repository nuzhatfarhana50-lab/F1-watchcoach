"use client";

import { useSignIn } from "@clerk/nextjs";
import { useState } from "react";

const POST_AUTHENTICATION_PATH = "/learning";
const OAUTH_CALLBACK_PATH = "/sso-callback";

export function GoogleSignIn() {
  const { fetchStatus, signIn } = useSignIn();
  const [isStarting, setIsStarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function startGoogleSignIn() {
    if (fetchStatus === "fetching" || isStarting) return;

    setIsStarting(true);
    setErrorMessage(null);

    try {
      const { error } = await signIn.sso({
        strategy: "oauth_google",
        redirectCallbackUrl: OAUTH_CALLBACK_PATH,
        redirectUrl: POST_AUTHENTICATION_PATH,
      });

      if (error) {
        setErrorMessage("Google sign-in could not be started. Please try again.");
        setIsStarting(false);
      }
    } catch {
      setErrorMessage("Google sign-in could not be started. Please try again.");
      setIsStarting(false);
    }
  }

  return (
    <div className="google-auth-panel">
      <div>
        <p className="section-label">Secure access</p>
        <h2>Continue with Google</h2>
        <p>One account keeps your race progress, concepts, and preferences in sync.</p>
      </div>
      <button
        type="button"
        className="google-auth-button"
        onClick={startGoogleSignIn}
        disabled={fetchStatus === "fetching" || isStarting}
        aria-busy={isStarting}
      >
        <GoogleMark />
        <span>{isStarting ? "Connecting to Google…" : "Continue with Google"}</span>
      </button>
      <p className="google-auth-note">Google is the only sign-in method supported by F1 Watchcoach.</p>
      {errorMessage ? <p className="google-auth-error" role="alert">{errorMessage}</p> : null}
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true">
      <path fill="#4285f4" d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.797 2.716v2.258h2.909c1.702-1.567 2.684-3.878 2.684-6.614Z" />
      <path fill="#34a853" d="M9 18c2.43 0 4.467-.806 5.956-2.181l-2.909-2.258c-.806.54-1.836.859-3.047.859-2.344 0-4.328-1.585-5.037-3.714H.956v2.333A9 9 0 0 0 9 18Z" />
      <path fill="#fbbc05" d="M3.963 10.706A5.42 5.42 0 0 1 3.681 9c0-.592.102-1.167.282-1.706V4.961H.956A9 9 0 0 0 0 9c0 1.452.347 2.827.956 4.039l3.007-2.333Z" />
      <path fill="#ea4335" d="M9 3.58c1.321 0 2.507.454 3.441 1.345l2.581-2.581C13.463.892 11.426 0 9 0A9 9 0 0 0 .956 4.961l3.007 2.333C4.672 5.165 6.656 3.58 9 3.58Z" />
    </svg>
  );
}
