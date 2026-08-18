import { describe, expect, it } from "vitest";

import payload from "./fixtures/british-2024.json";
import { JolpicaAdapter } from "./adapter";
import type { ProviderRequestClient } from "../requestClient";

const client: ProviderRequestClient = {
  async get(request) {
    return { data: payload, fetchedAt: "2026-08-18T12:00:00.000Z", sourceUrl: request.url };
  },
};

describe("JolpicaAdapter", () => {
  it("normalizes a race calendar response with provenance", async () => {
    const [race] = await new JolpicaAdapter(client).listRaces(2024);
    expect(race).toMatchObject({
      season: 2024,
      round: 12,
      name: "British Grand Prix",
      circuit: { externalId: "silverstone" },
      provenance: { provider: "jolpica", externalId: "2024:12" },
    });
  });

  it("normalizes identities and historical results", async () => {
    const result = await new JolpicaAdapter(client).getRaceResult(2024, 12);
    expect(result?.results[0]).toMatchObject({
      position: 1,
      gridPosition: 2,
      driver: { externalId: "hamilton", permanentNumber: 44 },
      team: { externalId: "mercedes" },
    });
  });
});
