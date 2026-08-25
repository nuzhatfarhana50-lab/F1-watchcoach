import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ClerkIdentityProvider, requireExternalUserId } from "./identity";

const clerkMocks = vi.hoisted(() => ({
  auth: vi.fn(),
  protect: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: Object.assign(clerkMocks.auth, { protect: clerkMocks.protect }),
}));

describe("Clerk identity boundaries", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test_configured_value");
    vi.stubEnv("CLERK_SECRET_KEY", "configured_server_key_value");
    clerkMocks.auth.mockReset();
    clerkMocks.protect.mockReset();
  });

  afterEach(() => vi.unstubAllEnvs());

  it("reads optional identity from the server session", async () => {
    clerkMocks.auth.mockResolvedValue({ userId: "user_google_123" });

    await expect(new ClerkIdentityProvider().currentExternalUserId()).resolves.toBe("user_google_123");
    expect(clerkMocks.auth).toHaveBeenCalledOnce();
  });

  it("enforces a protected session before returning an authenticated user ID", async () => {
    clerkMocks.protect.mockResolvedValue({ userId: "user_google_123" });

    await expect(requireExternalUserId()).resolves.toBe("user_google_123");
    expect(clerkMocks.protect).toHaveBeenCalledOnce();
    expect(clerkMocks.auth).not.toHaveBeenCalled();
  });

  it("fails closed when the protected boundary is used without Clerk configuration", async () => {
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "");
    vi.stubEnv("CLERK_SECRET_KEY", "");

    await expect(requireExternalUserId()).rejects.toThrow("Clerk authentication is not configured");
    expect(clerkMocks.protect).not.toHaveBeenCalled();
  });
});
