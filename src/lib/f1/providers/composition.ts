import "server-only";

import { serverEnvironment } from "@/lib/env/server";

import type { HistoricalRaceProvider, ProviderName, RecentSessionProvider } from "./contracts";
import { ProviderFailure } from "./errors";
import { JolpicaAdapter } from "./jolpica/adapter";
import { OpenF1Adapter } from "./openf1/adapter";
import { FetchProviderRequestClient } from "./requestClient";

const requestClient = new FetchProviderRequestClient();
const liveProviders = {
  historical: new JolpicaAdapter(requestClient),
  recent: new OpenF1Adapter(requestClient),
} as const;

const fixtureProviders = {
  historical: {
    async listRaces() { throw fixtureModeFailure("jolpica"); },
    async getRaceResult() { throw fixtureModeFailure("jolpica"); },
  } satisfies HistoricalRaceProvider,
  recent: {
    async findRaceSessions() { throw fixtureModeFailure("openf1"); },
    async getSessionEvidence() { throw fixtureModeFailure("openf1"); },
    async getCarData() { throw fixtureModeFailure("openf1"); },
  } satisfies RecentSessionProvider,
} as const;

export const f1Providers = serverEnvironment.F1_PROVIDER_MODE === "fixtures"
  ? fixtureProviders
  : liveProviders;

function fixtureModeFailure(provider: ProviderName): ProviderFailure {
  return new ProviderFailure(
    "unavailable",
    provider,
    `${provider} is disabled while deterministic fixtures are selected`,
    { providerMode: "fixtures" },
  );
}
