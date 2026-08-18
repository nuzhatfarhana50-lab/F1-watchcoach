import { afterEach, describe, expect, it, vi } from "vitest";

import { createLogger } from "./loggerCore";

describe("structured logger", () => {
  afterEach(() => vi.restoreAllMocks());

  it("redacts secret-like context while preserving diagnostics", () => {
    const output = vi.spyOn(console, "info").mockImplementation(() => undefined);
    createLogger({ service: "test" }, "debug").info("request", {
      requestId: "request-1",
      authorization: "Bearer should-not-appear",
    });
    const entry = JSON.parse(String(output.mock.calls[0]?.[0])) as Record<string, unknown>;
    expect(entry).toMatchObject({ level: "info", message: "request", requestId: "request-1", authorization: "[REDACTED]" });
    expect(JSON.stringify(entry)).not.toContain("should-not-appear");
  });
});
