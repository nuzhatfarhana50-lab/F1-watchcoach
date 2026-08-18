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
