import {
  conceptStateInputSchema,
  learningPreferencesInputSchema,
  momentEncounterInputSchema,
  raceProgressInputSchema,
} from "./schemas";
import type { LearningRepository } from "./ports";
import { LearningTransitionError } from "./errors";
import { learningStates } from "./types";
import type { LearningSnapshot, LearningState, LearningUser, RaceProgress } from "./types";

export class LearningService {
  constructor(private readonly repository: LearningRepository) {}

  resolveUser(externalAuthId: string): Promise<LearningUser> {
    if (!externalAuthId.trim()) throw new Error("External authentication ID is required");
    return this.repository.resolveUser(externalAuthId);
  }

  async saveRaceProgress(userId: string, input: unknown): Promise<RaceProgress> {
    return this.repository.saveRaceProgress(userId, raceProgressInputSchema.parse(input));
  }

  recordMomentEncounter(userId: string, input: unknown): Promise<number> {
    return this.repository.recordMomentEncounter(userId, momentEncounterInputSchema.parse(input));
  }

  async updateConceptState(userId: string, input: unknown): Promise<LearningState> {
    const parsed = conceptStateInputSchema.parse(input);
    const current = await this.repository.getConceptState(userId, parsed.conceptId);
    const currentIndex = learningStates.indexOf(current);
    const nextIndex = learningStates.indexOf(parsed.state);
    if (nextIndex < currentIndex || nextIndex > currentIndex + 1) {
      throw new LearningTransitionError(current, parsed.state);
    }
    return this.repository.setConceptState(userId, parsed);
  }

  updatePreferences(userId: string, input: unknown): Promise<LearningUser> {
    return this.repository.updatePreferences(userId, learningPreferencesInputSchema.parse(input));
  }

  getSnapshot(userId: string): Promise<LearningSnapshot> {
    return this.repository.getSnapshot(userId);
  }
}
