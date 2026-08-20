import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { RaceQuestionChat } from "./race-question-chat";

vi.mock("@/app/actions/race-question", () => ({
  askRaceQuestionAction: vi.fn(async ({ question }: { question: string }) => question.includes("noodles")
    ? { status: "blocked", message: "I can only answer questions about Formula 1 races using the connected F1 data sources." }
    : {
        status: "answered",
        answer: "Lewis Hamilton won the 2024 British Grand Prix.",
        sources: [{ id: "source-1", provider: "fia", title: "Official race report", url: "https://www.fia.com/example" }],
        raceHref: "/races/2024/12",
        generated: false,
      }),
}));

describe("RaceQuestionChat", () => {
  it("renders a scoped prompt and shows grounded evidence", async () => {
    const user = userEvent.setup();
    render(<RaceQuestionChat />);

    expect(screen.getByText("F1 sources only")).toBeVisible();
    await user.type(screen.getByLabelText("Ask a race question"), "Who won the 2024 British Grand Prix?");
    await user.click(screen.getByRole("button", { name: "Ask" }));

    expect(await screen.findByText("Lewis Hamilton won the 2024 British Grand Prix.")).toBeVisible();
    expect(screen.getByRole("link", { name: "Official race report" })).toHaveAttribute("href", "https://www.fia.com/example");
    expect(screen.getByRole("link", { name: "Open the race moments →" })).toHaveAttribute("href", "/races/2024/12");
  });

  it("shows the refusal returned for a non-F1 prompt", async () => {
    const user = userEvent.setup();
    render(<RaceQuestionChat />);

    await user.type(screen.getByLabelText("Ask a race question"), "How to make noodles?");
    await user.click(screen.getByRole("button", { name: "Ask" }));

    expect(await screen.findByText(/I can only answer questions about Formula 1 races/)).toBeVisible();
    expect(screen.queryByText("Evidence")).not.toBeInTheDocument();
  });
});
