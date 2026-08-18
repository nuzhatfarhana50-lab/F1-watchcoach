import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { RaceLibraryService, type MomentDetailReadModel } from "@/lib/f1/application/raceLibraryService";
import { canonicalRaceFixtures } from "@/lib/f1/fixtures/canonical-races";
import { InMemoryRaceCatalogRepository } from "@/lib/f1/repositories/inMemoryRaceCatalogRepository";

import { MomentEvidence } from "./moment-evidence";
import { MomentMedia } from "./moment-media";

describe("moment evidence and media states", () => {
  let moment: MomentDetailReadModel;

  beforeEach(async () => {
    const repository = new InMemoryRaceCatalogRepository();
    await repository.importFixtures(canonicalRaceFixtures);
    const result = await new RaceLibraryService(repository).getMoment(2024, 12, "hamilton-times-final-stop");
    if (result.kind !== "found") throw new Error("Canonical moment is missing");
    moment = result.moment;
  });

  it("states clearly when telemetry is missing", () => {
    render(<MomentEvidence moment={moment} />);
    expect(screen.getByLabelText("Telemetry availability")).toHaveTextContent("Telemetry not available");
    expect(screen.getByText("Hamilton pit stop")).toBeVisible();
  });

  it("does not imply evidence exists when records are partial", () => {
    render(<MomentEvidence moment={{ ...moment, evidence: [] }} />);
    expect(screen.getByRole("status")).toHaveTextContent("Structured evidence is incomplete");
  });

  it("shows a rights-safe unavailable state when media is absent", () => {
    render(<MomentMedia media={[]} />);
    expect(screen.getByRole("status")).toHaveTextContent("No embeddable media is available");
  });
});
