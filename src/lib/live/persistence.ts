import "server-only";

import { getDatabase } from "@/lib/db/client";

import type { LiveMomentCandidate } from "./types";

export type PersistenceSummary = { persisted: number; unchanged: number; skipped: boolean };

export interface LiveMomentPersistence {
  persist(sessionKey: number, candidates: readonly LiveMomentCandidate[]): Promise<PersistenceSummary>;
}

export class PrismaLiveMomentPersistence implements LiveMomentPersistence {
  async persist(sessionKey: number, candidates: readonly LiveMomentCandidate[]): Promise<PersistenceSummary> {
    if (!process.env.DATABASE_URL) return { persisted: 0, unchanged: 0, skipped: true };
    const database = getDatabase();
    const sessionReference = await database.externalDataReference.findUnique({
      where: {
        provider_resourceType_externalId: {
          provider: "OPENF1",
          resourceType: "SESSION",
          externalId: String(sessionKey),
        },
      },
      select: { sessionId: true },
    });
    if (!sessionReference?.sessionId) return { persisted: 0, unchanged: 0, skipped: true };
    const race = await database.race.findUnique({ where: { sessionId: sessionReference.sessionId } });
    if (!race) return { persisted: 0, unchanged: 0, skipped: true };

    const source = await database.source.upsert({
      where: { url: "https://api.openf1.org/v1/" },
      create: {
        provider: "OPENF1",
        kind: "STRUCTURED_DATA",
        title: "OpenF1 live timing API",
        url: "https://api.openf1.org/v1/",
      },
      update: { retrievedAt: new Date() },
    });

    let persisted = 0;
    let unchanged = 0;
    for (const candidate of candidates) {
      const existing = await database.raceMoment.findUnique({ where: { id: candidate.id }, select: { id: true } });
      await database.raceMoment.upsert({
        where: { id: candidate.id },
        create: {
          id: candidate.id,
          raceId: race.id,
          sessionId: race.sessionId,
          slug: `live-${candidate.type.toLowerCase().replaceAll("_", "-")}-${candidate.id.slice(0, 8)}`,
          type: candidate.type,
          status: "DETECTED",
          title: candidate.title,
          summary: candidate.summary,
          lapNumber: candidate.lapNumber,
          occurredAt: candidate.occurredAt ? new Date(candidate.occurredAt) : null,
          sequence: 10_000 + Number.parseInt(candidate.id.slice(0, 6), 16),
          importance: candidate.confidence >= 0.98 ? 4 : 3,
          sources: { create: { sourceId: source.id } },
        },
        update: {
          title: candidate.title,
          summary: candidate.summary,
          lapNumber: candidate.lapNumber,
          occurredAt: candidate.occurredAt ? new Date(candidate.occurredAt) : null,
        },
      });
      await database.externalDataReference.upsert({
        where: {
          provider_resourceType_externalId: {
            provider: "OPENF1",
            resourceType: "RACE_MOMENT",
            externalId: candidate.id,
          },
        },
        create: {
          provider: "OPENF1",
          resourceType: "RACE_MOMENT",
          externalId: candidate.id,
          sourceId: source.id,
          sourceUrl: "https://api.openf1.org/v1/",
          raceMomentId: candidate.id,
          fetchedAt: new Date(),
        },
        update: { fetchedAt: new Date(), raceMomentId: candidate.id },
      });
      if (existing) unchanged += 1;
      else persisted += 1;
    }
    return { persisted, unchanged, skipped: false };
  }
}
