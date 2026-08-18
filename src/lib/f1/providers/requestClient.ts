import type { ProviderName } from "./contracts";
import { ProviderFailure } from "./errors";

export type ProviderRequest = {
  provider: ProviderName;
  url: string;
  cacheTtlMs: number;
  headers?: Readonly<Record<string, string>>;
};

export type ProviderResponse = {
  data: unknown;
  fetchedAt: string;
  sourceUrl: string;
};

export interface ProviderRequestClient {
  get(request: ProviderRequest): Promise<ProviderResponse>;
}

type CacheRecord = {
  expiresAt: number;
  response: ProviderResponse;
};

export class FetchProviderRequestClient implements ProviderRequestClient {
  private readonly cache = new Map<string, CacheRecord>();
  private readonly inFlight = new Map<string, Promise<ProviderResponse>>();

  constructor(
    private readonly fetcher: typeof fetch = fetch,
    private readonly now: () => number = Date.now,
  ) {}

  async get(request: ProviderRequest): Promise<ProviderResponse> {
    const cached = this.cache.get(request.url);
    if (cached && cached.expiresAt > this.now()) return cached.response;

    const active = this.inFlight.get(request.url);
    if (active) return active;

    const pending = this.fetchOnce(request).finally(() => {
      this.inFlight.delete(request.url);
    });
    this.inFlight.set(request.url, pending);
    return pending;
  }

  private async fetchOnce(request: ProviderRequest): Promise<ProviderResponse> {
    let response: Response;
    try {
      response = await this.fetcher(request.url, {
        headers: request.headers,
        signal: AbortSignal.timeout(10_000),
      });
    } catch (error) {
      throw new ProviderFailure(
        "unavailable",
        request.provider,
        `${request.provider} could not be reached`,
        { sourceUrl: request.url },
        { cause: error },
      );
    }

    if (!response.ok) {
      const kind = response.status === 429 ? "rateLimited" : "unavailable";
      throw new ProviderFailure(kind, request.provider, `${request.provider} returned HTTP ${response.status}`, {
        sourceUrl: request.url,
        status: response.status,
      });
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch (error) {
      throw new ProviderFailure(
        "schemaDrift",
        request.provider,
        `${request.provider} returned invalid JSON`,
        { sourceUrl: request.url },
        { cause: error },
      );
    }

    const normalized: ProviderResponse = {
      data,
      fetchedAt: new Date(this.now()).toISOString(),
      sourceUrl: request.url,
    };
    this.cache.set(request.url, {
      expiresAt: this.now() + request.cacheTtlMs,
      response: normalized,
    });
    return normalized;
  }
}
