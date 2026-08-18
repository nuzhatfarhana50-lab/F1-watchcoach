import { describe, expect, it } from "vitest";

import {
  EnvironmentConfigurationError,
  parseServerEnvironment,
} from "./schema";

describe("parseServerEnvironment", () => {
  it("applies a safe default log level", () => {
    expect(
      parseServerEnvironment({ NODE_ENV: "test", LOG_LEVEL: undefined }),
    ).toEqual({
      NODE_ENV: "test",
      LOG_LEVEL: "info",
      OPENAI_GENERATION_MODEL: "gpt-5-mini",
      OPENAI_EMBEDDING_MODEL: "text-embedding-3-small",
    });
  });

  it("reports invalid keys without including their values", () => {
    expect(() =>
      parseServerEnvironment({
        NODE_ENV: "production",
        LOG_LEVEL: "definitely-a-secret-value",
      }),
    ).toThrowError(new EnvironmentConfigurationError(["LOG_LEVEL"]));
  });

  it("requires Clerk keys as a pair without exposing either value", () => {
    expect(() => parseServerEnvironment({
      NODE_ENV: "production",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_configured_value",
    })).toThrowError(new EnvironmentConfigurationError(["CLERK_SECRET_KEY"]));
  });
});
