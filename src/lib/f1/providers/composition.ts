import "server-only";

import { JolpicaAdapter } from "./jolpica/adapter";
import { OpenF1Adapter } from "./openf1/adapter";
import { FetchProviderRequestClient } from "./requestClient";

const requestClient = new FetchProviderRequestClient();

export const f1Providers = {
  historical: new JolpicaAdapter(requestClient),
  recent: new OpenF1Adapter(requestClient),
} as const;
