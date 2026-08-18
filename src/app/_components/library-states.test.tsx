import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EmptyRaceLibrary, ProviderUnavailable, UnsupportedSeason } from "./library-states";

describe("race library states", () => {
  it("makes empty, unavailable, and unsupported states explicit", () => {
    const { rerender } = render(<EmptyRaceLibrary />);
    expect(screen.getByRole("heading", { name: "The race library is empty." })).toBeVisible();

    rerender(<ProviderUnavailable provider="OpenF1" />);
    expect(screen.getByRole("status")).toHaveTextContent("OpenF1 did not return a usable response");

    rerender(<UnsupportedSeason season={2022} supportedSeasons={[2024, 2023]} />);
    expect(screen.getByRole("heading", { name: "2022 is not in this library yet." })).toBeVisible();
  });
});
