export class LearningTransitionError extends Error {
  constructor(public readonly from: string, public readonly to: string) {
    super(`Learning state cannot move from ${from} to ${to}`);
    this.name = "LearningTransitionError";
  }
}

export class LearningUnavailableError extends Error {
  constructor(message = "Personal learning memory is unavailable") {
    super(message);
    this.name = "LearningUnavailableError";
  }
}
