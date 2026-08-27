import { defineConfig, devices } from "@playwright/test";

const inheritedEnvironment = Object.fromEntries(
  Object.entries(process.env).filter(
    (entry): entry is [string, string] => typeof entry[1] === "string",
  ),
);

export default defineConfig({
  testDir: "./tests/e2e",
  snapshotPathTemplate: "{testDir}/{testFilePath}-snapshots/{arg}-{projectName}{ext}",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    env: {
      ...inheritedEnvironment,
      AI_WORKFLOW_SECRET: "",
      CLERK_SECRET_KEY: "",
      CRON_SECRET: "",
      F1_PROVIDER_MODE: "fixtures",
      INGESTION_SECRET: "",
      LIVE_SESSION_KEY: "",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "",
      OPENAI_API_KEY: "",
      REDIS_REST_TOKEN: "",
      REDIS_REST_URL: "",
    },
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
