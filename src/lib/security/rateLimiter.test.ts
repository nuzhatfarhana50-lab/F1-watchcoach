import { describe, expect, it } from "vitest";

import { FixedWindowRateLimiter } from "./rateLimiter";

describe("FixedWindowRateLimiter", () => {
  it("rejects bursts and resets at the next bounded window", () => {
    let now = 1_000;
    const limiter = new FixedWindowRateLimiter(2, 1_000, () => now);
    expect(limiter.allow("ingestion")).toBe(true);
    expect(limiter.allow("ingestion")).toBe(true);
    expect(limiter.allow("ingestion")).toBe(false);
    now = 2_000;
    expect(limiter.allow("ingestion")).toBe(true);
  });

  it("isolates independent keys", () => {
    const limiter = new FixedWindowRateLimiter(1, 1_000, () => 1_000);
    expect(limiter.allow("a")).toBe(true);
    expect(limiter.allow("b")).toBe(true);
  });
});
