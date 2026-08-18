import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

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
    expect(screen.getByRole("link", { name: "Browse the race library" })).toHaveAttribute("href", "/races");
  });
});
