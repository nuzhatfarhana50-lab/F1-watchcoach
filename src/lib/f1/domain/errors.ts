export type DomainInvariantCode =
  | "duplicateId"
  | "duplicateExternalReference"
  | "invalidDateRange"
  | "missingReference"
  | "mismatchedRelationship";

export class DomainInvariantError extends Error {
  constructor(
    public readonly code: DomainInvariantCode,
    message: string,
    public readonly context: Readonly<Record<string, string | number>> = {},
  ) {
    super(message);
    this.name = "DomainInvariantError";
  }
}
