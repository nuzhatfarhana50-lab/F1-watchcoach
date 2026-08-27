import { expect, test, type Page } from "@playwright/test";

const momentUrl = "/races/2024/12/moments/hamilton-times-final-stop";
// Keep local reviews strict while allowing for the bounded CoreText/FreeType
// rasterization and line-wrap variance between macOS baselines and Linux CI.
const maxDiffPixelRatio = process.env.CI ? 0.12 : 0.05;

test.describe.configure({ mode: "serial" });

async function prepareVisualSnapshot(page: Page) {
  await page.waitForLoadState("networkidle");
  await expect(
    page.getByRole("heading", { name: "Hamilton times the switch back to slicks" }),
  ).toBeVisible();
}

test("moment detail desktop visual", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(momentUrl);
  await prepareVisualSnapshot(page);
  await expect(page.locator(".moment-hero")).toHaveScreenshot("moment-detail-desktop.png", {
    animations: "disabled",
    maxDiffPixelRatio,
  });
});

test("moment detail mobile visual", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(momentUrl);
  await prepareVisualSnapshot(page);
  await expect(page.locator(".moment-hero")).toHaveScreenshot("moment-detail-mobile.png", {
    animations: "disabled",
    maxDiffPixelRatio,
  });
});
