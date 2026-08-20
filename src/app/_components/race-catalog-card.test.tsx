import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RaceCatalogCard } from "./race-catalog-card";

describe("RaceCatalogCard", () => {
  it("shows normalized source coverage and links to the internal race record", () => {
    render(<RaceCatalogCard race={{
      id: "jolpica:2024:12",
      season: 2024,
      round: 12,
      name: "British Grand Prix",
      officialName: "British Grand Prix",
      date: "2024-07-07",
      circuit: { name: "Silverstone Circuit", locality: "Silverstone", country: "UK" },
      status: "completed",
      momentCount: 2,
      href: "/races/2024/12",
      openF1SessionKey: 9558,
      coverage: { calendar: true, timing: true, learning: true },
      sources: [
        { provider: "jolpica", label: "Jolpica calendar", url: "https://example.test/jolpica" },
        { provider: "openf1", label: "OpenF1 session and timing", url: "https://example.test/openf1" },
        { provider: "watchcoach", label: "Watchcoach learning moments" },
      ],
    }} />);

    expect(screen.getByRole("link", { name: "Open British Grand Prix 2024" })).toHaveAttribute("href", "/races/2024/12");
    expect(screen.getByText("Jolpica + OpenF1")).toBeVisible();
    expect(screen.getByText("Timing")).toBeVisible();
    expect(screen.getByText("2 moments")).toBeVisible();
  });
});
