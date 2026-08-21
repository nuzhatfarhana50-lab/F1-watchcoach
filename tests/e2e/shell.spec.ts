import { expect, test } from "@playwright/test";

test("renders the product shell and learning loop", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "Understand the race you just watched.",
    }),
  ).toBeVisible();
  await expect(page.getByText("Watch", { exact: true })).toBeVisible();
  await expect(page.getByText("Learn", { exact: true })).toBeVisible();
  await expect(page.getByText("Connect", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ask about an F1 race." })).toBeVisible();
});

test("race chat answers from fixtures and blocks non-F1 questions", async ({ page }) => {
  await page.goto("/");
  const homeChat = page.locator(".race-chat-section");
  const input = homeChat.getByLabel("Ask a race question");

  await input.fill("Who won the 2024 British Grand Prix?");
  await homeChat.getByRole("button", { name: "Ask" }).click();
  await expect(homeChat.getByText(/Lewis Hamilton won the 2024 British Grand Prix/)).toBeVisible();
  await expect(homeChat.getByText("Evidence", { exact: true })).toBeVisible();

  await input.fill("How to make noodles?");
  await homeChat.getByRole("button", { name: "Ask" }).click();
  await expect(homeChat.getByText(/I can only answer questions about Formula 1 races/)).toBeVisible();
});

test("floating Watchcoach opens on race pages and preserves the F1-only boundary", async ({ page }) => {
  await page.goto("/races?season=2024");
  await page.getByRole("button", { name: "Open Watchcoach race assistant" }).click();

  const widget = page.getByRole("complementary", { name: "Ask about an F1 race" });
  await expect(widget).toBeVisible();
  await expect(widget.getByLabel("Ask a race question")).toBeFocused();
  await widget.getByLabel("Ask a race question").fill("How to make noodles?");
  await widget.getByRole("button", { name: "Ask" }).click();
  await expect(widget.getByText(/I can only answer questions about Formula 1 races/)).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(widget).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Open Watchcoach race assistant" })).toBeFocused();
});

test("browses the race library and opens the 2024 British Grand Prix", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Browse the race library" }).click();

  await expect(page).toHaveURL(/\/races$/);
  await expect(page.getByRole("heading", { name: "Every season. Real race records." })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Season" })).toBeVisible();
  await page.getByRole("link", { name: "2024", exact: true }).click();
  await expect(page).toHaveURL(/\/races\?season=2024$/);
  await expect(page.getByRole("heading", { name: "2024 Formula 1 season" })).toBeVisible();
  await page.getByRole("link", { name: "Open British Grand Prix 2024" }).click();

  await expect(page).toHaveURL(/\/races\/2024\/12$/);
  await expect(page.getByRole("heading", { level: 1, name: "British Grand Prix" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Hamilton times the switch back to slicks" })).toBeVisible();
  await expect(page.getByText("Pit window · strategy")).toBeVisible();
});

test("follows Watch → Learn → Connect through grounded moment content", async ({ page }) => {
  await page.goto("/races/2024/12");
  await page.getByRole("link", { name: "Explore evidence and explanation" }).first().click();

  await expect(page).toHaveURL(/\/races\/2024\/12\/moments\/hamilton-times-final-stop$/);
  await expect(page.getByRole("heading", { level: 1, name: "Hamilton times the switch back to slicks" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Start with what happened on track." })).toBeVisible();
  await expect(page.getByText("Hamilton pit stop")).toBeVisible();
  await expect(page.getByLabel("Telemetry availability")).toContainText("Telemetry not available");
  await expect(page.getByRole("heading", { name: "Pit window" })).toBeVisible();
  const connection = page.getByRole("link", { name: /Pérez reacts immediately to rain/ });
  await expect(connection).toBeVisible();
  await expect(page.getByRole("heading", { name: "Trace the claims." })).toBeVisible();
  await connection.click();
  await expect(page).toHaveURL(/\/races\/2023\/13\/moments\/perez-pits-as-rain-arrives$/);
  await expect(page.getByRole("heading", { level: 1, name: "Pérez reacts immediately to rain" })).toBeVisible();
});

test("moment detail preserves landmarks and keyboard focus at mobile width", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/races/2024/12/moments/hamilton-times-final-stop");

  await expect(page.locator("main")).toHaveCount(1);
  await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await expect(page.getByRole("heading", { name: "Read the race before the terminology." })).toBeVisible();
});

test("anonymous learning remains complete when authentication is not configured", async ({ page }) => {
  await page.goto("/races/2024/12/moments/hamilton-times-final-stop");
  await expect(page.getByRole("heading", { name: "Pit window" })).toBeVisible();
  await expect(page.getByLabel("Saving availability")).toContainText("Public learning is ready");
  await page.goto("/sign-in");
  await expect(page.getByRole("status")).toHaveText("Authentication is not configured in this environment.");
  await page.goto("/learning");
  await expect(page.getByRole("heading", { name: "Learning memory unavailable" })).toBeVisible();
  await page.getByRole("link", { name: "Browse races" }).click();
  await expect(page.getByRole("heading", { name: "Every season. Real race records." })).toBeVisible();
});

test("internal AI workflow trigger is unavailable without server configuration", async ({ request }) => {
  const response = await request.post("/api/internal/ai/explanations", {
    data: { momentId: "80000000-0000-4000-8000-000000000001" },
  });
  expect(response.status()).toBe(503);
  await expect(response.json()).resolves.toEqual({ error: "AI workflow is not configured" });
});

test("live ingestion boundaries fail closed while historical learning stays available", async ({ request, page }) => {
  const ingestion = await request.post("/api/ingestion/live", { data: { sessionKey: 9558 } });
  expect(ingestion.status()).toBe(503);
  const cron = await request.get("/api/cron/live");
  expect(cron.status()).toBe(503);
  const live = await request.get("/api/live/9558");
  expect(live.status()).toBe(503);

  await page.goto("/live/9558");
  await expect(page.getByRole("heading", { name: "Live timing is unavailable." })).toBeVisible();
  await page.getByRole("link", { name: "Races" }).first().click();
  await expect(page.getByRole("heading", { name: "Every season. Real race records." })).toBeVisible();
});
