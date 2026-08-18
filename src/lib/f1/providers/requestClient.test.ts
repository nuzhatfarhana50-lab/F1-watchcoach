import { describe, expect, it, vi } from "vitest";

import { ProviderFailure } from "./errors";
import { FetchProviderRequestClient } from "./requestClient";

describe("FetchProviderRequestClient", () => {
  it("deduplicates concurrent requests and reuses fresh responses", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const client = new FetchProviderRequestClient(fetcher as typeof fetch, () => 1_000);
    const request = { provider: "jolpica" as const, url: "https://example.test/races", cacheTtlMs: 60_000 };

    const [first, second] = await Promise.all([client.get(request), client.get(request)]);
    const third = await client.get(request);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(first).toEqual(second);
    expect(third).toEqual(first);
  });

  it("returns typed rate-limit failures", async () => {
    const client = new FetchProviderRequestClient(
      vi.fn(async () => new Response(null, { status: 429 })) as typeof fetch,
    );

    await expect(
      client.get({ provider: "openf1", url: "https://example.test/laps", cacheTtlMs: 1 }),
    ).rejects.toMatchObject({ kind: "rateLimited", provider: "openf1" } satisfies Partial<ProviderFailure>);
  });
});
