import "server-only";

import { getDatabase } from "@/lib/db/client";

import type { LearningRepository } from "./ports";
import type {
  ConceptStateInput,
  LearningPreferencesInput,
  MomentEncounterInput,
  RaceProgressInput,
} from "./schemas";
import type { LearningSnapshot, LearningState, LearningUser, RaceProgress } from "./types";

function toUser(record: {
  id: string;
  externalAuthId: string;
  explanationDepth: LearningUser["explanationDepth"];
  learningStyle: LearningUser["learningStyle"];
}): LearningUser {
  return record;
}

export class PrismaLearningRepository implements LearningRepository {
  async resolveUser(externalAuthId: string): Promise<LearningUser> {
    const user = await getDatabase().user.upsert({
      where: { externalAuthId },
      create: { externalAuthId },
      update: {},
    });
    return toUser(user);
  }

  async saveRaceProgress(userId: string, input: RaceProgressInput): Promise<RaceProgress> {
    const completed = input.progressPercent === 100;
    const progress = await getDatabase().userRaceHistory.upsert({
      where: { userId_raceId: { userId, raceId: input.raceId } },
      create: {
        userId,
        raceId: input.raceId,
        progressPercent: input.progressPercent,
        status: completed ? "COMPLETED" : "STARTED",
        completedAt: completed ? new Date() : null,
        lastMomentId: input.lastMomentId ?? null,
      },
      update: {
        progressPercent: input.progressPercent,
        status: completed ? "COMPLETED" : "STARTED",
        completedAt: completed ? new Date() : null,
        lastMomentId: input.lastMomentId,
        lastViewedAt: new Date(),
      },
    });
    return {
      userId: progress.userId,
      raceId: progress.raceId,
      status: progress.status,
      progressPercent: progress.progressPercent,
      lastMomentId: progress.lastMomentId,
    };
  }

  async recordMomentEncounter(userId: string, input: MomentEncounterInput): Promise<number> {
    const encounter = await getDatabase().userMomentEncounter.upsert({
      where: { userId_raceMomentId: { userId, raceMomentId: input.raceMomentId } },
      create: { userId, raceMomentId: input.raceMomentId },
      update: { encounterCount: { increment: 1 }, lastSeenAt: new Date() },
    });
    return encounter.encounterCount;
  }

  async getConceptState(userId: string, conceptId: string): Promise<LearningState> {
    const record = await getDatabase().userLearningState.findUnique({
      where: { userId_conceptId: { userId, conceptId } },
      select: { state: true },
    });
    return record?.state ?? "UNSEEN";
  }

  async setConceptState(userId: string, input: ConceptStateInput): Promise<LearningState> {
    const record = await getDatabase().userLearningState.upsert({
      where: { userId_conceptId: { userId, conceptId: input.conceptId } },
      create: {
        userId,
        conceptId: input.conceptId,
        state: input.state,
        encounterCount: input.state === "UNSEEN" ? 0 : 1,
      },
      update: { state: input.state, lastUpdatedAt: new Date() },
    });
    return record.state;
  }

  async updatePreferences(userId: string, input: LearningPreferencesInput): Promise<LearningUser> {
    const database = getDatabase();
    const user = await database.$transaction(async (transaction) => {
      const updated = await transaction.user.update({
        where: { id: userId },
        data: { explanationDepth: input.explanationDepth, learningStyle: input.learningStyle },
      });
      await transaction.userInterest.deleteMany({ where: { userId } });
      await transaction.userInterest.createMany({
        data: [...new Set(input.interests)].map((topic) => ({ userId, topic })),
      });
      if (input.driverIds) {
        await transaction.userDriverPreference.deleteMany({ where: { userId } });
        await transaction.userDriverPreference.createMany({
          data: [...new Set(input.driverIds)].map((driverId) => ({ userId, driverId })),
        });
      }
      if (input.teamIds) {
        await transaction.userTeamPreference.deleteMany({ where: { userId } });
        await transaction.userTeamPreference.createMany({
          data: [...new Set(input.teamIds)].map((teamId) => ({ userId, teamId })),
        });
      }
      return updated;
    });
    return toUser(user);
  }

  async getSnapshot(userId: string): Promise<LearningSnapshot> {
    const user = await getDatabase().user.findUniqueOrThrow({
      where: { id: userId },
      include: { raceHistory: true, learningStates: true },
    });
    return {
      user: toUser(user),
      raceProgress: user.raceHistory.map((progress) => ({
        userId: progress.userId,
        raceId: progress.raceId,
        status: progress.status,
        progressPercent: progress.progressPercent,
        lastMomentId: progress.lastMomentId,
      })),
      conceptStates: Object.fromEntries(user.learningStates.map((state) => [state.conceptId, state.state])),
    };
  }
}
