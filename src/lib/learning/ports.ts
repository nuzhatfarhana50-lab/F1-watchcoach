import type {
  ConceptStateInput,
  LearningPreferencesInput,
  MomentEncounterInput,
  RaceProgressInput,
} from "./schemas";
import type { LearningSnapshot, LearningState, LearningUser, RaceProgress } from "./types";

export interface LearningRepository {
  resolveUser(externalAuthId: string): Promise<LearningUser>;
  saveRaceProgress(userId: string, input: RaceProgressInput): Promise<RaceProgress>;
  recordMomentEncounter(userId: string, input: MomentEncounterInput): Promise<number>;
  getConceptState(userId: string, conceptId: string): Promise<LearningState>;
  setConceptState(userId: string, input: ConceptStateInput): Promise<LearningState>;
  updatePreferences(userId: string, input: LearningPreferencesInput): Promise<LearningUser>;
  getSnapshot(userId: string): Promise<LearningSnapshot>;
}
