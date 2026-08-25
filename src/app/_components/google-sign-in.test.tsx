import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GoogleSignIn } from "./google-sign-in";

const clerkMocks = vi.hoisted(() => ({
  sso: vi.fn(),
}));

vi.mock("@clerk/nextjs", () => ({
  useSignIn: () => ({
    errors: {},
    fetchStatus: "idle",
    signIn: { sso: clerkMocks.sso },
  }),
}));

describe("GoogleSignIn", () => {
  beforeEach(() => clerkMocks.sso.mockReset());

  it("starts only the Google OAuth flow with fixed local redirects", async () => {
    clerkMocks.sso.mockResolvedValue({ error: null });
    render(<GoogleSignIn />);

    fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));

    await waitFor(() => expect(clerkMocks.sso).toHaveBeenCalledWith({
      strategy: "oauth_google",
      redirectCallbackUrl: "/sso-callback",
      redirectUrl: "/learning",
    }));
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("shows a safe retry message when Clerk cannot start OAuth", async () => {
    clerkMocks.sso.mockResolvedValue({ error: new Error("provider detail") });
    render(<GoogleSignIn />);

    fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Google sign-in could not be started. Please try again.",
    );
    expect(screen.getByRole("alert")).not.toHaveTextContent("provider detail");
  });
});
