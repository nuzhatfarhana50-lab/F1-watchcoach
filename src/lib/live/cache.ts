import { liveSessionStateSchema } from "./schemas";
import type { LiveSessionState } from "./types";

export interface LiveStateCache {
  get(sessionKey: number): Promise<LiveSessionState | null>;
  set(state: LiveSessionState, ttlSeconds: number): Promise<void>;
}

export class InMemoryLiveStateCache implements LiveStateCache {
  private readonly values = new Map<number, { state: LiveSessionState; expiresAt: number }>();

  async get(sessionKey: number) {
    const record = this.values.get(sessionKey);
    if (!record) return null;
    if (record.expiresAt <= Date.now()) {
      this.values.delete(sessionKey);
      return null;
    }
    return structuredClone(record.state);
  }

  async set(state: LiveSessionState, ttlSeconds: number) {
    this.values.set(state.sessionKey, {
      state: structuredClone(state),
      expiresAt: Date.now() + ttlSeconds * 1_000,
    });
  }
}

export class RedisRestLiveStateCache implements LiveStateCache {
  constructor(private readonly url: string, private readonly token: string) {}

  async get(sessionKey: number): Promise<LiveSessionState | null> {
    const result = await this.command(["GET", this.key(sessionKey)]);
    if (result == null) return null;
    return liveSessionStateSchema.parse(JSON.parse(String(result)));
  }

  async set(state: LiveSessionState, ttlSeconds: number): Promise<void> {
    liveSessionStateSchema.parse(state);
    await this.command(["SET", this.key(state.sessionKey), JSON.stringify(state), "EX", String(ttlSeconds)]);
  }

  private key(sessionKey: number) {
    return `f1-watchcoach:live:${sessionKey}`;
  }

  private async command(command: readonly string[]): Promise<unknown> {
    const response = await fetch(this.url, {
      method: "POST",
      headers: { authorization: `Bearer ${this.token}`, "content-type": "application/json" },
      body: JSON.stringify(command),
      signal: AbortSignal.timeout(5_000),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Redis REST request failed with status ${response.status}`);
    const parsed = await response.json() as { result?: unknown; error?: string };
    if (parsed.error) throw new Error("Redis REST command failed");
    return parsed.result;
  }
}
