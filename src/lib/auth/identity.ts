import "server-only";

import { isClerkConfigured } from "./configuration";

export interface IdentityProvider {
  currentExternalUserId(): Promise<string | null>;
}

export class ClerkIdentityProvider implements IdentityProvider {
  async currentExternalUserId(): Promise<string | null> {
    if (!isClerkConfigured()) return null;
    const { auth } = await import("@clerk/nextjs/server");
    return (await auth()).userId;
  }
}

export const identityProvider: IdentityProvider = new ClerkIdentityProvider();

export async function requireExternalUserId(): Promise<string> {
  if (!isClerkConfigured()) {
    throw new Error("Clerk authentication is not configured");
  }

  const { auth } = await import("@clerk/nextjs/server");
  const session = await auth.protect();
  return session.userId;
}
