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
