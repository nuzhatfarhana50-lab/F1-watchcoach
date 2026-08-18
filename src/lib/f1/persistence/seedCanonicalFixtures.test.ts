import { describe, expect, it } from "vitest";

import { canonicalSeedTransactionOptions } from "./seedCanonicalFixtures";

describe("canonical seed transaction policy", () => {
  it("allows Neon startup latency while keeping the seed bounded", () => {
    expect(canonicalSeedTransactionOptions).toEqual({
      maxWait: 30_000,
      timeout: 120_000,
    });
  });
});
