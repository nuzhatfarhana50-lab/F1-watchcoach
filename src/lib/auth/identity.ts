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
