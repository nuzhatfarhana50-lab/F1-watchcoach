export class AiGenerationError extends Error {
  constructor(
    public readonly kind: "unavailable" | "invalidOutput" | "ungroundedReferences" | "insufficientEvidence",
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "AiGenerationError";
  }
}
