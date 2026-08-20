import { describe, expect, it } from "vitest";

import { JolpicaAdapter } from "@/lib/f1/providers/jolpica/adapter";
import { OpenF1Adapter } from "@/lib/f1/providers/openf1/adapter";
import { FetchProviderRequestClient } from "@/lib/f1/providers/requestClient";

const live = process.env.LIVE_F1_PROVIDER_TESTS === "1";

describe.skipIf(!live)("live F1 provider smoke checks", () => {
  const client = new FetchProviderRequestClient();

  it("reads a stable historical Jolpica race", async () => {
    const result = await new JolpicaAdapter(client).getRaceResult(2024, 12);
    expect(result?.race.name).toBe("British Grand Prix");
    expect(result?.results.length).toBeGreaterThan(0);
  });

  it("finds OpenF1 race sessions for a supported season", async () => {
    const sessions = await new OpenF1Adapter(client).findRaceSessions(2024);
    expect(sessions).toHaveLength(24);
    expect(sessions.every((session) => session.name === "Race")).toBe(true);
    expect(sessions.some((session) => session.circuitShortName.toLowerCase().includes("silverstone"))).toBe(true);
    expect(sessions.find((session) => session.circuitShortName.toLowerCase().includes("silverstone"))?.sessionKey).toBe(9558);
  });
});
