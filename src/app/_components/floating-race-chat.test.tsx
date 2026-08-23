import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { FloatingRaceChat } from "./floating-race-chat";

vi.mock("@/app/actions/race-question", () => ({
  askRaceQuestionAction: vi.fn(async () => ({
    status: "blocked",
    message: "I can only answer questions about Formula 1 races using the connected F1 data sources.",
  })),
}));

describe("FloatingRaceChat", () => {
  it("opens from the mascot, reuses the scoped chat, and closes with Escape", async () => {
    const user = userEvent.setup();
    render(<FloatingRaceChat />);

    const trigger = screen.getByRole("button", { name: "Open Watchcoach F1 assistant" });
    const panel = screen.getByTestId("floating-race-chat-panel");
    expect(panel).not.toBeVisible();

    await user.click(trigger);
    expect(panel).toBeVisible();
    await waitFor(() => expect(screen.getByLabelText("Ask an F1 question")).toHaveFocus());

    await user.type(screen.getByLabelText("Ask an F1 question"), "How to make noodles?");
    await user.click(screen.getByRole("button", { name: "Ask" }));
    expect(await screen.findByText(/I can only answer questions about Formula 1 races/)).toBeVisible();

    await user.keyboard("{Escape}");
    expect(panel).not.toBeVisible();
    await waitFor(() => expect(screen.getByRole("button", { name: "Open Watchcoach F1 assistant" })).toHaveFocus());
  });
});
