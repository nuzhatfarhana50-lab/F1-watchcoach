import { DomainInvariantError } from "./errors";
import { raceFixtureCollectionSchema } from "./schemas";
import type { RaceFixtureCollection } from "./types";

type Identified = { id: string };

function indexById<T extends Identified>(items: readonly T[], label: string) {
  const index = new Map<string, T>();
  for (const item of items) {
    if (index.has(item.id)) {
      throw new DomainInvariantError("duplicateId", `Duplicate ${label} id: ${item.id}`, {
        id: item.id,
        collection: label,
      });
    }
    index.set(item.id, item);
  }
  return index;
}

function requireReference<T>(index: ReadonlyMap<string, T>, id: string, relationship: string): T {
  const value = index.get(id);
  if (!value) {
    throw new DomainInvariantError("missingReference", `Missing ${relationship}: ${id}`, {
      id,
      relationship,
    });
  }
  return value;
}

function assertDateRange(from: string, to: string | undefined, label: string) {
  if (to && from > to) {
    throw new DomainInvariantError("invalidDateRange", `${label} ends before it begins`, {
      from,
      to,
    });
  }
}

export function validateFixtureCollection(input: unknown): RaceFixtureCollection {
  const fixture = raceFixtureCollectionSchema.parse(input);
  const sources = indexById(fixture.sources, "source");
  const seasons = indexById(fixture.seasons, "season");
  const circuits = indexById(fixture.circuits, "circuit");
  const grandsPrix = indexById(fixture.grandsPrix, "grandPrix");
  const sessions = indexById(fixture.sessions, "session");
  const races = indexById(fixture.races, "race");
  const drivers = indexById(fixture.drivers, "driver");
  const teams = indexById(fixture.teams, "team");
  const moments = indexById(fixture.moments, "raceMoment");

  const sourcedObjects = [
    ...fixture.seasons,
    ...fixture.circuits,
    ...fixture.grandsPrix,
    ...fixture.sessions,
    ...fixture.races,
    ...fixture.drivers,
    ...fixture.teams,
    ...fixture.teamSeasonIdentities,
    ...fixture.driverTeamMemberships,
    ...fixture.moments,
  ];
  for (const item of sourcedObjects) {
    for (const sourceId of item.sourceIds) requireReference(sources, sourceId, "source");
  }

  for (const grandPrix of fixture.grandsPrix) {
    requireReference(seasons, grandPrix.seasonId, "grandPrix.season");
    requireReference(circuits, grandPrix.circuitId, "grandPrix.circuit");
    assertDateRange(grandPrix.startDate, grandPrix.endDate, grandPrix.officialName);
  }
  for (const session of fixture.sessions) {
    requireReference(grandsPrix, session.grandPrixId, "session.grandPrix");
    assertDateRange(session.startsAt, session.endsAt, session.name);
  }
  for (const race of fixture.races) {
    const session = requireReference(sessions, race.sessionId, "race.session");
    requireReference(grandsPrix, race.grandPrixId, "race.grandPrix");
    if (session.grandPrixId !== race.grandPrixId || session.type !== "race") {
      throw new DomainInvariantError("mismatchedRelationship", "Race session does not belong to its Grand Prix", {
        raceId: race.id,
        sessionId: session.id,
      });
    }
    if (race.startedAt) assertDateRange(race.startedAt, race.endedAt, race.id);
  }
  for (const identity of fixture.teamSeasonIdentities) {
    requireReference(teams, identity.teamId, "teamIdentity.team");
    requireReference(seasons, identity.seasonId, "teamIdentity.season");
    assertDateRange(identity.validFrom, identity.validTo, identity.id);
  }
  for (const membership of fixture.driverTeamMemberships) {
    requireReference(drivers, membership.driverId, "membership.driver");
    requireReference(teams, membership.teamId, "membership.team");
    requireReference(seasons, membership.seasonId, "membership.season");
    assertDateRange(membership.validFrom, membership.validTo, membership.id);
  }
  for (const moment of fixture.moments) {
    const race = requireReference(races, moment.raceId, "moment.race");
    if (race.sessionId !== moment.sessionId) {
      throw new DomainInvariantError("mismatchedRelationship", "Moment session does not match its race", {
        momentId: moment.id,
      });
    }
    for (const participant of moment.drivers) requireReference(drivers, participant.entityId, "moment.driver");
    for (const participant of moment.teams) requireReference(teams, participant.entityId, "moment.team");
    for (const evidence of moment.evidence) {
      for (const sourceId of evidence.sourceIds) requireReference(sources, sourceId, "evidence.source");
      if ("driverId" in evidence) requireReference(drivers, evidence.driverId, "evidence.driver");
      if (evidence.type === "tyreStint" && evidence.startLap > evidence.endLap) {
        throw new DomainInvariantError("invalidDateRange", "Tyre stint ends before it begins", { evidenceId: evidence.id });
      }
    }
    const conceptIds = new Set(moment.concepts.map((concept) => concept.id));
    for (const conceptId of moment.explanation.conceptIds) requireReference(new Map([...conceptIds].map((id) => [id, true])), conceptId, "explanation.concept");
    for (const sourceId of moment.explanation.sourceIds) requireReference(sources, sourceId, "explanation.source");
    for (const connection of moment.connections) {
      requireReference(moments, connection.targetMomentId, "connection.targetMoment");
      for (const sourceId of connection.sourceIds) requireReference(sources, sourceId, "connection.source");
    }
    for (const media of moment.media) {
      for (const sourceId of media.sourceIds) requireReference(sources, sourceId, "media.source");
    }
  }

  const entityIndexes = { season: seasons, circuit: circuits, grandPrix: grandsPrix, session: sessions, race: races, driver: drivers, team: teams, raceMoment: moments };
  const externalKeys = new Set<string>();
  indexById(fixture.externalReferences, "externalReference");
  for (const reference of fixture.externalReferences) {
    const key = `${reference.provider}:${reference.resourceType}:${reference.externalId}`;
    if (externalKeys.has(key)) {
      throw new DomainInvariantError("duplicateExternalReference", `Duplicate external reference: ${key}`, { key });
    }
    externalKeys.add(key);
    requireReference(sources, reference.sourceId, "externalReference.source");
    if (!entityIndexes[reference.resourceType].has(reference.entityId)) {
      throw new DomainInvariantError("missingReference", `Missing externalReference.${reference.resourceType}: ${reference.entityId}`, {
        id: reference.entityId,
        relationship: `externalReference.${reference.resourceType}`,
      });
    }
  }

  return fixture;
}
