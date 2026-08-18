export const learningStates = ["UNSEEN", "ENCOUNTERED", "LEARNING", "UNDERSTOOD", "REINFORCED"] as const;
export type LearningState = (typeof learningStates)[number];

export type ExplanationDepth = "BEGINNER" | "STANDARD" | "DETAILED";
export type LearningStyle = "BALANCED" | "VISUAL" | "TECHNICAL";

export type LearningUser = {
  id: string;
  externalAuthId: string;
  explanationDepth: ExplanationDepth;
  learningStyle: LearningStyle;
};

export type RaceProgress = {
  userId: string;
  raceId: string;
  status: "STARTED" | "COMPLETED";
  progressPercent: number;
  lastMomentId: string | null;
};

export type LearningSnapshot = {
  user: LearningUser;
  raceProgress: readonly RaceProgress[];
  conceptStates: Readonly<Record<string, LearningState>>;
};
