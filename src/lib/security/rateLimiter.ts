export interface RateLimiter {
  allow(key: string): boolean;
}

export class FixedWindowRateLimiter implements RateLimiter {
  private readonly windows = new Map<string, { count: number; resetsAt: number }>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now,
  ) {
    if (limit < 1 || windowMs < 1) throw new Error("Rate limiter bounds must be positive");
  }

  allow(key: string): boolean {
    const currentTime = this.now();
    const current = this.windows.get(key);
    if (!current || current.resetsAt <= currentTime) {
      this.windows.set(key, { count: 1, resetsAt: currentTime + this.windowMs });
      return true;
    }
    if (current.count >= this.limit) return false;
    current.count += 1;
    return true;
  }
}
