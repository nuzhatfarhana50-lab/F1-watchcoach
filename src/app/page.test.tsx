import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/actions/race-question", () => ({ askRaceQuestionAction: vi.fn() }));

import Home from "./page";

describe("home page", () => {
  it("introduces the race-first learning loop", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", {
        name: "Understand the race you just watched.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Watch", { selector: "strong" })).toBeVisible();
    expect(screen.getByText("Learn", { selector: "strong" })).toBeVisible();
    expect(screen.getByText("Connect", { selector: "strong" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Ask about an F1 race." })).toBeVisible();
    expect(screen.getByLabelText("Ask a race question")).toBeVisible();
    expect(screen.getByRole("link", { name: "Browse the race library" })).toHaveAttribute("href", "/races");
  });
});
