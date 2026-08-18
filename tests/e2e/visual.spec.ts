import { expect, test } from "@playwright/test";

const momentUrl = "/races/2024/12/moments/hamilton-times-final-stop";

test("moment detail desktop visual", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(momentUrl);
  await expect(page.locator("main")).toHaveScreenshot("moment-detail-desktop.png", {
    animations: "disabled",
    maxDiffPixelRatio: 0.05,
  });
});

test("moment detail mobile visual", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(momentUrl);
  await expect(page.locator("main")).toHaveScreenshot("moment-detail-mobile.png", {
    animations: "disabled",
    maxDiffPixelRatio: 0.05,
  });
});
