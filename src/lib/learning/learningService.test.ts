import { describe, expect, it } from "vitest";

import { LearningTransitionError } from "./errors";
import { LearningService } from "./learningService";
import type { LearningRepository } from "./ports";
import type { LearningPreferencesInput, RaceProgressInput } from "./schemas";
import type { LearningSnapshot, LearningState, LearningUser, RaceProgress } from "./types";

const raceId = "50000000-0000-4000-8000-000000000001";
const momentId = "80000000-0000-4000-8000-000000000001";
const conceptId = "90000000-0000-4000-8000-000000000001";

class TestLearningRepository implements LearningRepository {
  private readonly users = new Map<string, LearningUser>();
  private readonly progress = new Map<string, RaceProgress>();
  private readonly encounters = new Map<string, number>();
  private readonly concepts = new Map<string, LearningState>();

  async resolveUser(externalAuthId: string) {
    const existing = this.users.get(externalAuthId);
    if (existing) return existing;
    const user: LearningUser = {
      id: `10000000-0000-4000-8000-${String(this.users.size + 1).padStart(12, "0")}`,
      externalAuthId,
      explanationDepth: "BEGINNER",
      learningStyle: "BALANCED",
    };
    this.users.set(externalAuthId, user);
    return user;
  }

  async saveRaceProgress(userId: string, input: RaceProgressInput) {
    const record: RaceProgress = {
      userId,
      raceId: input.raceId,
      status: input.progressPercent === 100 ? "COMPLETED" : "STARTED",
      progressPercent: input.progressPercent,
      lastMomentId: input.lastMomentId ?? null,
    };
    this.progress.set(`${userId}:${input.raceId}`, record);
    return record;
  }

  async recordMomentEncounter(userId: string, input: { raceMomentId: string }) {
    const key = `${userId}:${input.raceMomentId}`;
    const count = (this.encounters.get(key) ?? 0) + 1;
    this.encounters.set(key, count);
    return count;
  }

  async getConceptState(userId: string, id: string) {
    return this.concepts.get(`${userId}:${id}`) ?? "UNSEEN";
  }

  async setConceptState(userId: string, input: { conceptId: string; state: LearningState }) {
    this.concepts.set(`${userId}:${input.conceptId}`, input.state);
    return input.state;
  }

  async updatePreferences(userId: string, input: LearningPreferencesInput) {
    const user = [...this.users.values()].find((candidate) => candidate.id === userId);
    if (!user) throw new Error("Missing user");
    const updated = { ...user, explanationDepth: input.explanationDepth, learningStyle: input.learningStyle };
    this.users.set(user.externalAuthId, updated);
    return updated;
  }

  async getSnapshot(userId: string): Promise<LearningSnapshot> {
    const user = [...this.users.values()].find((candidate) => candidate.id === userId);
    if (!user) throw new Error("Missing user");
    const userProgress = [...this.progress.values()].filter((record) => record.userId === userId);
    const conceptStates = Object.fromEntries([...this.concepts].filter(([key]) => key.startsWith(`${userId}:`)).map(([key, state]) => [key.split(":")[1], state]));
    return { user, raceProgress: userProgress, conceptStates };
  }
}

describe("LearningService", () => {
  it("keeps progress and encounters isolated by internal user ID", async () => {
    const service = new LearningService(new TestLearningRepository());
    const first = await service.resolveUser("clerk-a");
    const second = await service.resolveUser("clerk-b");
    await service.saveRaceProgress(first.id, { raceId, progressPercent: 50, lastMomentId: momentId });
    await service.recordMomentEncounter(first.id, { raceMomentId: momentId });
    await service.recordMomentEncounter(first.id, { raceMomentId: momentId });

    expect((await service.getSnapshot(first.id)).raceProgress).toHaveLength(1);
    expect((await service.getSnapshot(second.id)).raceProgress).toHaveLength(0);
  });

  it("allows only same or next-step learning transitions", async () => {
    const service = new LearningService(new TestLearningRepository());
    const user = await service.resolveUser("clerk-a");
    await expect(service.updateConceptState(user.id, { conceptId, state: "ENCOUNTERED" })).resolves.toBe("ENCOUNTERED");
    await expect(service.updateConceptState(user.id, { conceptId, state: "UNDERSTOOD" })).rejects.toBeInstanceOf(LearningTransitionError);
    await expect(service.updateConceptState(user.id, { conceptId, state: "LEARNING" })).resolves.toBe("LEARNING");
    await expect(service.updateConceptState(user.id, { conceptId, state: "UNSEEN" })).rejects.toBeInstanceOf(LearningTransitionError);
  });

  it("validates completion and preference boundaries", async () => {
    const service = new LearningService(new TestLearningRepository());
    const user = await service.resolveUser("clerk-a");
    await expect(service.saveRaceProgress(user.id, { raceId, progressPercent: 101 })).rejects.toThrow();
    await expect(service.saveRaceProgress(user.id, { raceId, progressPercent: 100 })).resolves.toMatchObject({ status: "COMPLETED" });
  });
});
