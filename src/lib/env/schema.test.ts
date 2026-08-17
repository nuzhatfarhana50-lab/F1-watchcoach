import { describe, expect, it } from "vitest";

import {
  EnvironmentConfigurationError,
  parseServerEnvironment,
} from "./schema";

describe("parseServerEnvironment", () => {
  it("applies a safe default log level", () => {
    expect(
      parseServerEnvironment({ NODE_ENV: "test", LOG_LEVEL: undefined }),
    ).toEqual({ NODE_ENV: "test", LOG_LEVEL: "info" });
  });

  it("reports invalid keys without including their values", () => {
    expect(() =>
      parseServerEnvironment({
        NODE_ENV: "production",
        LOG_LEVEL: "definitely-a-secret-value",
      }),
    ).toThrowError(new EnvironmentConfigurationError(["LOG_LEVEL"]));
  });
});
