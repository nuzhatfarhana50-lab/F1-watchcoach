import type { ProviderName } from "./contracts";

export type ProviderFailureKind =
  | "invalidRequest"
  | "unavailable"
  | "rateLimited"
  | "schemaDrift"
  | "unsupported";

export class ProviderFailure extends Error {
  constructor(
    public readonly kind: ProviderFailureKind,
    public readonly provider: ProviderName,
    message: string,
    public readonly context: Readonly<Record<string, string | number | boolean | undefined>> = {},
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "ProviderFailure";
  }
}

export function isProviderFailure(error: unknown): error is ProviderFailure {
  return error instanceof ProviderFailure;
}
