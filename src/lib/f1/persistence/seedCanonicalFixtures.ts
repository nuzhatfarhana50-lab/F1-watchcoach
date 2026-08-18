import type { PrismaClient } from "@/generated/prisma/client";
import {
  ConceptCategory,
  ExternalResourceType,
  MediaKind,
  MediaProvider,
  MomentConnectionReason,
  ParticipantRole,
  RaceControlCategory,
  RaceMomentStatus,
  RaceMomentType,
  RaceStatus,
  SessionType,
  SourceKind,
  SourceProvider,
  StandingKind,
  TyreCompound,
} from "@/generated/prisma/enums";
import { canonicalRaceFixtures } from "@/lib/f1/fixtures/canonical-races";

const upperSnake = (value: string) => value.replace(/([a-z])([A-Z])/g, "$1_$2").toUpperCase();

export const canonicalSeedTransactionOptions = {
  maxWait: 30_000,
  timeout: 120_000,
} as const;

export async function seedCanonicalFixtures(database: PrismaClient) {
  const fixture = canonicalRaceFixtures;
  const concepts = [
    ...new Map(
      fixture.moments.flatMap((moment) => moment.concepts).map((concept) => [concept.id, concept]),
    ).values(),
  ];
  await database.$transaction(async (tx) => {
    for (const source of fixture.sources) {
      await tx.source.upsert({ where: { id: source.id }, update: { provider: SourceProvider[upperSnake(source.provider) as keyof typeof SourceProvider], kind: SourceKind[upperSnake(source.kind) as keyof typeof SourceKind], title: source.title, url: source.url, publishedAt: source.publishedAt ? new Date(source.publishedAt) : null, retrievedAt: new Date(source.retrievedAt) }, create: { id: source.id, provider: SourceProvider[upperSnake(source.provider) as keyof typeof SourceProvider], kind: SourceKind[upperSnake(source.kind) as keyof typeof SourceKind], title: source.title, url: source.url, publishedAt: source.publishedAt ? new Date(source.publishedAt) : undefined, retrievedAt: new Date(source.retrievedAt) } });
    }
    for (const concept of concepts) {
      await tx.concept.upsert({
        where: { id: concept.id },
        update: {
          slug: concept.slug,
          name: concept.name,
          category: ConceptCategory[upperSnake(concept.category) as keyof typeof ConceptCategory],
          definition: concept.definition,
        },
        create: {
          id: concept.id,
          slug: concept.slug,
          name: concept.name,
          category: ConceptCategory[upperSnake(concept.category) as keyof typeof ConceptCategory],
          definition: concept.definition,
        },
      });
      await tx.conceptSource.deleteMany({ where: { conceptId: concept.id } });
      await tx.conceptSource.createMany({
        data: concept.sourceIds.map((sourceId) => ({ conceptId: concept.id, sourceId })),
      });
    }
    for (const season of fixture.seasons) await tx.season.upsert({ where: { id: season.id }, update: { year: season.year }, create: { id: season.id, year: season.year } });
    for (const circuit of fixture.circuits) await tx.circuit.upsert({ where: { id: circuit.id }, update: { slug: circuit.slug, name: circuit.name, locality: circuit.locality, country: circuit.country, countryCode: circuit.countryCode }, create: { id: circuit.id, slug: circuit.slug, name: circuit.name, locality: circuit.locality, country: circuit.country, countryCode: circuit.countryCode } });
    for (const grandPrix of fixture.grandsPrix) await tx.grandPrix.upsert({ where: { id: grandPrix.id }, update: { seasonId: grandPrix.seasonId, circuitId: grandPrix.circuitId, round: grandPrix.round, officialName: grandPrix.officialName, shortName: grandPrix.shortName, startDate: new Date(`${grandPrix.startDate}T00:00:00Z`), endDate: new Date(`${grandPrix.endDate}T00:00:00Z`) }, create: { id: grandPrix.id, seasonId: grandPrix.seasonId, circuitId: grandPrix.circuitId, round: grandPrix.round, officialName: grandPrix.officialName, shortName: grandPrix.shortName, startDate: new Date(`${grandPrix.startDate}T00:00:00Z`), endDate: new Date(`${grandPrix.endDate}T00:00:00Z`) } });
    for (const session of fixture.sessions) await tx.session.upsert({ where: { id: session.id }, update: { grandPrixId: session.grandPrixId, type: SessionType[upperSnake(session.type) as keyof typeof SessionType], name: session.name, startsAt: new Date(session.startsAt), endsAt: session.endsAt ? new Date(session.endsAt) : null }, create: { id: session.id, grandPrixId: session.grandPrixId, type: SessionType[upperSnake(session.type) as keyof typeof SessionType], name: session.name, startsAt: new Date(session.startsAt), endsAt: session.endsAt ? new Date(session.endsAt) : undefined } });
    for (const race of fixture.races) await tx.race.upsert({ where: { id: race.id }, update: { grandPrixId: race.grandPrixId, sessionId: race.sessionId, status: RaceStatus[upperSnake(race.status) as keyof typeof RaceStatus], scheduledLaps: race.scheduledLaps, actualLaps: race.actualLaps, startedAt: race.startedAt ? new Date(race.startedAt) : null, endedAt: race.endedAt ? new Date(race.endedAt) : null }, create: { id: race.id, grandPrixId: race.grandPrixId, sessionId: race.sessionId, status: RaceStatus[upperSnake(race.status) as keyof typeof RaceStatus], scheduledLaps: race.scheduledLaps, actualLaps: race.actualLaps, startedAt: race.startedAt ? new Date(race.startedAt) : undefined, endedAt: race.endedAt ? new Date(race.endedAt) : undefined } });
    for (const driver of fixture.drivers) await tx.driver.upsert({ where: { id: driver.id }, update: { slug: driver.slug, givenName: driver.givenName, familyName: driver.familyName, code: driver.code, permanentNumber: driver.permanentNumber, nationality: driver.nationality }, create: { id: driver.id, slug: driver.slug, givenName: driver.givenName, familyName: driver.familyName, code: driver.code, permanentNumber: driver.permanentNumber, nationality: driver.nationality } });
    for (const team of fixture.teams) await tx.team.upsert({ where: { id: team.id }, update: { slug: team.slug, canonicalName: team.canonicalName }, create: { id: team.id, slug: team.slug, canonicalName: team.canonicalName } });
    for (const identity of fixture.teamSeasonIdentities) await tx.teamSeasonIdentity.upsert({ where: { id: identity.id }, update: { teamId: identity.teamId, seasonId: identity.seasonId, displayName: identity.displayName, constructorName: identity.constructorName, nationality: identity.nationality, validFrom: new Date(`${identity.validFrom}T00:00:00Z`), validTo: identity.validTo ? new Date(`${identity.validTo}T00:00:00Z`) : null }, create: { id: identity.id, teamId: identity.teamId, seasonId: identity.seasonId, displayName: identity.displayName, constructorName: identity.constructorName, nationality: identity.nationality, validFrom: new Date(`${identity.validFrom}T00:00:00Z`), validTo: identity.validTo ? new Date(`${identity.validTo}T00:00:00Z`) : undefined } });
    for (const membership of fixture.driverTeamMemberships) await tx.driverTeamMembership.upsert({ where: { id: membership.id }, update: { driverId: membership.driverId, teamId: membership.teamId, seasonId: membership.seasonId, carNumber: membership.carNumber, validFrom: new Date(`${membership.validFrom}T00:00:00Z`), validTo: membership.validTo ? new Date(`${membership.validTo}T00:00:00Z`) : null }, create: { id: membership.id, driverId: membership.driverId, teamId: membership.teamId, seasonId: membership.seasonId, carNumber: membership.carNumber, validFrom: new Date(`${membership.validFrom}T00:00:00Z`), validTo: membership.validTo ? new Date(`${membership.validTo}T00:00:00Z`) : undefined } });
    for (const lap of fixture.laps) await tx.lap.upsert({ where: { id: lap.id }, update: { sessionId: lap.sessionId, driverId: lap.driverId, sourceId: lap.sourceId, number: lap.number, startedAt: lap.startedAt ? new Date(lap.startedAt) : null, durationMs: lap.durationMs, isPersonalBest: lap.isPersonalBest }, create: { id: lap.id, sessionId: lap.sessionId, driverId: lap.driverId, sourceId: lap.sourceId, number: lap.number, startedAt: lap.startedAt ? new Date(lap.startedAt) : undefined, durationMs: lap.durationMs, isPersonalBest: lap.isPersonalBest } });
    for (const position of fixture.positions) await tx.position.upsert({ where: { id: position.id }, update: { sessionId: position.sessionId, driverId: position.driverId, sourceId: position.sourceId, sequence: position.sequence, recordedAt: position.recordedAt ? new Date(position.recordedAt) : null, lapNumber: position.lapNumber, position: position.position }, create: { id: position.id, sessionId: position.sessionId, driverId: position.driverId, sourceId: position.sourceId, sequence: position.sequence, recordedAt: position.recordedAt ? new Date(position.recordedAt) : undefined, lapNumber: position.lapNumber, position: position.position } });
    for (const pitStop of fixture.pitStops) await tx.pitStop.upsert({ where: { id: pitStop.id }, update: { sessionId: pitStop.sessionId, driverId: pitStop.driverId, sourceId: pitStop.sourceId, stopNumber: pitStop.stopNumber, lapNumber: pitStop.lapNumber, occurredAt: pitStop.occurredAt ? new Date(pitStop.occurredAt) : null, stationaryDurationMs: pitStop.stationaryDurationMs, pitLaneDurationMs: pitStop.pitLaneDurationMs }, create: { id: pitStop.id, sessionId: pitStop.sessionId, driverId: pitStop.driverId, sourceId: pitStop.sourceId, stopNumber: pitStop.stopNumber, lapNumber: pitStop.lapNumber, occurredAt: pitStop.occurredAt ? new Date(pitStop.occurredAt) : undefined, stationaryDurationMs: pitStop.stationaryDurationMs, pitLaneDurationMs: pitStop.pitLaneDurationMs } });
    for (const stint of fixture.tyreStints) await tx.tyreStint.upsert({ where: { id: stint.id }, update: { sessionId: stint.sessionId, driverId: stint.driverId, sourceId: stint.sourceId, stintNumber: stint.stintNumber, startLap: stint.startLap, endLap: stint.endLap, compound: TyreCompound[upperSnake(stint.compound) as keyof typeof TyreCompound], tyreAgeAtStart: stint.tyreAgeAtStart }, create: { id: stint.id, sessionId: stint.sessionId, driverId: stint.driverId, sourceId: stint.sourceId, stintNumber: stint.stintNumber, startLap: stint.startLap, endLap: stint.endLap, compound: TyreCompound[upperSnake(stint.compound) as keyof typeof TyreCompound], tyreAgeAtStart: stint.tyreAgeAtStart } });
    for (const event of fixture.raceControlEvents) await tx.raceControlEvent.upsert({ where: { id: event.id }, update: { sessionId: event.sessionId, sourceId: event.sourceId, sequence: event.sequence, occurredAt: event.occurredAt ? new Date(event.occurredAt) : null, lapNumber: event.lapNumber, category: RaceControlCategory[upperSnake(event.category) as keyof typeof RaceControlCategory], message: event.message }, create: { id: event.id, sessionId: event.sessionId, sourceId: event.sourceId, sequence: event.sequence, occurredAt: event.occurredAt ? new Date(event.occurredAt) : undefined, lapNumber: event.lapNumber, category: RaceControlCategory[upperSnake(event.category) as keyof typeof RaceControlCategory], message: event.message } });
    for (const result of fixture.results) await tx.result.upsert({ where: { id: result.id }, update: { sessionId: result.sessionId, driverId: result.driverId, teamId: result.teamId, sourceId: result.sourceId, classification: result.classification, gridPosition: result.gridPosition, lapsCompleted: result.lapsCompleted, points: result.points, status: result.status, fastestLapRank: result.fastestLapRank }, create: { id: result.id, sessionId: result.sessionId, driverId: result.driverId, teamId: result.teamId, sourceId: result.sourceId, classification: result.classification, gridPosition: result.gridPosition, lapsCompleted: result.lapsCompleted, points: result.points, status: result.status, fastestLapRank: result.fastestLapRank } });
    for (const standing of fixture.championshipStandings) await tx.championshipStanding.upsert({ where: { id: standing.id }, update: { seasonId: standing.seasonId, afterGrandPrixId: standing.afterGrandPrixId, driverId: standing.driverId, teamId: standing.teamId, sourceId: standing.sourceId, kind: StandingKind[upperSnake(standing.kind) as keyof typeof StandingKind], position: standing.position, points: standing.points, wins: standing.wins }, create: { id: standing.id, seasonId: standing.seasonId, afterGrandPrixId: standing.afterGrandPrixId, driverId: standing.driverId, teamId: standing.teamId, sourceId: standing.sourceId, kind: StandingKind[upperSnake(standing.kind) as keyof typeof StandingKind], position: standing.position, points: standing.points, wins: standing.wins } });
    for (const moment of fixture.moments) {
      await tx.raceMoment.upsert({ where: { id: moment.id }, update: { raceId: moment.raceId, sessionId: moment.sessionId, slug: moment.slug, type: RaceMomentType[upperSnake(moment.type) as keyof typeof RaceMomentType], status: RaceMomentStatus[upperSnake(moment.status) as keyof typeof RaceMomentStatus], title: moment.title, summary: moment.summary, lapNumber: moment.lapNumber, occurredAt: moment.occurredAt ? new Date(moment.occurredAt) : null, sequence: moment.sequence, importance: moment.importance }, create: { id: moment.id, raceId: moment.raceId, sessionId: moment.sessionId, slug: moment.slug, type: RaceMomentType[upperSnake(moment.type) as keyof typeof RaceMomentType], status: RaceMomentStatus[upperSnake(moment.status) as keyof typeof RaceMomentStatus], title: moment.title, summary: moment.summary, lapNumber: moment.lapNumber, occurredAt: moment.occurredAt ? new Date(moment.occurredAt) : undefined, sequence: moment.sequence, importance: moment.importance } });
      await tx.raceMomentDriver.deleteMany({ where: { raceMomentId: moment.id } });
      await tx.raceMomentDriver.createMany({ data: moment.drivers.map((participant) => ({ raceMomentId: moment.id, driverId: participant.entityId, role: ParticipantRole[upperSnake(participant.role) as keyof typeof ParticipantRole] })) });
      await tx.raceMomentTeam.deleteMany({ where: { raceMomentId: moment.id } });
      await tx.raceMomentTeam.createMany({ data: moment.teams.map((participant) => ({ raceMomentId: moment.id, teamId: participant.entityId, role: ParticipantRole[upperSnake(participant.role) as keyof typeof ParticipantRole] })) });
      await tx.raceMomentSource.deleteMany({ where: { raceMomentId: moment.id } });
      await tx.raceMomentSource.createMany({ data: moment.sourceIds.map((sourceId) => ({ raceMomentId: moment.id, sourceId })) });
    }
    for (const moment of fixture.moments) {
      await tx.raceMomentConcept.deleteMany({ where: { raceMomentId: moment.id } });
      await tx.raceMomentConcept.createMany({
        data: moment.concepts.map((concept) => ({ raceMomentId: moment.id, conceptId: concept.id })),
      });

      const explanation = moment.explanation;
      await tx.explanation.upsert({
        where: { id: explanation.id },
        update: {
          raceMomentId: moment.id,
          slug: explanation.slug,
          whatHappened: explanation.whatHappened,
          whyItHappened: explanation.whyItHappened,
          whyItMatters: explanation.whyItMatters,
          watchNext: explanation.watchNext,
        },
        create: {
          id: explanation.id,
          raceMomentId: moment.id,
          slug: explanation.slug,
          whatHappened: explanation.whatHappened,
          whyItHappened: explanation.whyItHappened,
          whyItMatters: explanation.whyItMatters,
          watchNext: explanation.watchNext,
        },
      });
      await tx.explanationConcept.deleteMany({ where: { explanationId: explanation.id } });
      await tx.explanationConcept.createMany({
        data: explanation.conceptIds.map((conceptId) => ({ explanationId: explanation.id, conceptId })),
      });
      await tx.explanationSource.deleteMany({ where: { explanationId: explanation.id } });
      await tx.explanationSource.createMany({
        data: explanation.sourceIds.map((sourceId) => ({ explanationId: explanation.id, sourceId })),
      });

      await tx.raceMomentMedia.deleteMany({ where: { raceMomentId: moment.id } });
      for (const media of moment.media) {
        await tx.media.upsert({
          where: { id: media.id },
          update: {
            provider: MediaProvider[upperSnake(media.provider) as keyof typeof MediaProvider],
            providerId: media.providerId ?? null,
            kind: MediaKind[upperSnake(media.kind) as keyof typeof MediaKind],
            title: media.title,
            url: media.url,
            embedUrl: media.embedUrl ?? null,
            startTimestampSeconds: media.startTimestampSeconds ?? null,
            license: media.license ?? null,
            attribution: media.attribution,
          },
          create: {
            id: media.id,
            provider: MediaProvider[upperSnake(media.provider) as keyof typeof MediaProvider],
            providerId: media.providerId,
            kind: MediaKind[upperSnake(media.kind) as keyof typeof MediaKind],
            title: media.title,
            url: media.url,
            embedUrl: media.embedUrl,
            startTimestampSeconds: media.startTimestampSeconds,
            license: media.license,
            attribution: media.attribution,
          },
        });
        await tx.mediaSource.deleteMany({ where: { mediaId: media.id } });
        await tx.mediaSource.createMany({
          data: media.sourceIds.map((sourceId) => ({ mediaId: media.id, sourceId })),
        });
        await tx.raceMomentMedia.create({ data: { raceMomentId: moment.id, mediaId: media.id } });
      }

      await tx.momentConnection.deleteMany({ where: { sourceMomentId: moment.id } });
      for (const connection of moment.connections) {
        await tx.momentConnection.upsert({
          where: { id: connection.id },
          update: {
            sourceMomentId: moment.id,
            targetMomentId: connection.targetMomentId,
            reason: MomentConnectionReason[
              upperSnake(connection.reason) as keyof typeof MomentConnectionReason
            ],
            explanation: connection.explanation,
          },
          create: {
            id: connection.id,
            sourceMomentId: moment.id,
            targetMomentId: connection.targetMomentId,
            reason: MomentConnectionReason[
              upperSnake(connection.reason) as keyof typeof MomentConnectionReason
            ],
            explanation: connection.explanation,
          },
        });
        await tx.momentConnectionSource.deleteMany({
          where: { momentConnectionId: connection.id },
        });
        await tx.momentConnectionSource.createMany({
          data: connection.sourceIds.map((sourceId) => ({
            momentConnectionId: connection.id,
            sourceId,
          })),
        });
      }
    }
    for (const reference of fixture.externalReferences) {
      const entityKey = `${reference.resourceType}Id` as const;
      const relation = { [entityKey]: reference.entityId };
      await tx.externalDataReference.upsert({ where: { id: reference.id }, update: { provider: SourceProvider[upperSnake(reference.provider) as keyof typeof SourceProvider], resourceType: ExternalResourceType[upperSnake(reference.resourceType) as keyof typeof ExternalResourceType], externalId: reference.externalId, sourceId: reference.sourceId, sourceUrl: reference.sourceUrl, fetchedAt: new Date(reference.fetchedAt), sourceTimestamp: reference.sourceTimestamp ? new Date(reference.sourceTimestamp) : null, ...relation }, create: { id: reference.id, provider: SourceProvider[upperSnake(reference.provider) as keyof typeof SourceProvider], resourceType: ExternalResourceType[upperSnake(reference.resourceType) as keyof typeof ExternalResourceType], externalId: reference.externalId, sourceId: reference.sourceId, sourceUrl: reference.sourceUrl, fetchedAt: new Date(reference.fetchedAt), sourceTimestamp: reference.sourceTimestamp ? new Date(reference.sourceTimestamp) : undefined, ...relation } });
    }
  }, canonicalSeedTransactionOptions);
  return {
    races: fixture.races.length,
    moments: fixture.moments.length,
    sources: fixture.sources.length,
    concepts: concepts.length,
    explanations: fixture.moments.length,
    media: fixture.moments.reduce((count, moment) => count + moment.media.length, 0),
    connections: fixture.moments.reduce((count, moment) => count + moment.connections.length, 0),
  };
}
