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
});

test("browses the race library and opens the 2024 British Grand Prix", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Browse the race library" }).click();

  await expect(page).toHaveURL(/\/races$/);
  await expect(page.getByRole("heading", { name: "Start with a race you watched." })).toBeVisible();
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

test("internal AI workflow trigger is unavailable without server configuration", async ({ request }) => {
  const response = await request.post("/api/internal/ai/explanations", {
    data: { momentId: "80000000-0000-4000-8000-000000000001" },
  });
  expect(response.status()).toBe(503);
  await expect(response.json()).resolves.toEqual({ error: "AI workflow is not configured" });
});
