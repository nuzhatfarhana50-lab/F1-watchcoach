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
  const laps = indexById(fixture.laps, "lap");
  const positions = indexById(fixture.positions, "position");
  const pitStops = indexById(fixture.pitStops, "pitStop");
  const tyreStints = indexById(fixture.tyreStints, "tyreStint");
  const raceControlEvents = indexById(fixture.raceControlEvents, "raceControlEvent");
  const results = indexById(fixture.results, "result");
  const championshipStandings = indexById(fixture.championshipStandings, "championshipStanding");
  const explanations = indexById(fixture.moments.map((moment) => moment.explanation), "explanation");
  const connections = indexById(fixture.moments.flatMap((moment) => moment.connections), "momentConnection");
  const mediaItems = indexById(fixture.moments.flatMap((moment) => moment.media), "media");
  const concepts = new Map<string, (typeof fixture.moments)[number]["concepts"][number]>();

  for (const concept of fixture.moments.flatMap((moment) => moment.concepts)) {
    const existing = concepts.get(concept.id);
    if (existing && JSON.stringify(existing) !== JSON.stringify(concept)) {
      throw new DomainInvariantError("mismatchedRelationship", `Concept ${concept.id} has conflicting definitions`, {
        conceptId: concept.id,
      });
    }
    concepts.set(concept.id, concept);
  }

  const mediaUrls = new Set<string>();
  const mediaProviderKeys = new Set<string>();
  for (const media of mediaItems.values()) {
    if (mediaUrls.has(media.url)) {
      throw new DomainInvariantError("duplicateId", `Duplicate media URL: ${media.url}`, { url: media.url });
    }
    mediaUrls.add(media.url);
    if (media.providerId) {
      const providerKey = `${media.provider}:${media.providerId}`;
      if (mediaProviderKeys.has(providerKey)) {
        throw new DomainInvariantError("duplicateId", `Duplicate media provider reference: ${providerKey}`, {
          providerKey,
        });
      }
      mediaProviderKeys.add(providerKey);
    }
  }

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
  for (const concept of concepts.values()) {
    for (const sourceId of concept.sourceIds) requireReference(sources, sourceId, "concept.source");
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
  for (const lap of fixture.laps) {
    requireReference(sessions, lap.sessionId, "lap.session");
    requireReference(drivers, lap.driverId, "lap.driver");
    requireReference(sources, lap.sourceId, "lap.source");
  }
  for (const position of fixture.positions) {
    requireReference(sessions, position.sessionId, "position.session");
    requireReference(drivers, position.driverId, "position.driver");
    requireReference(sources, position.sourceId, "position.source");
  }
  for (const pitStop of fixture.pitStops) {
    requireReference(sessions, pitStop.sessionId, "pitStop.session");
    requireReference(drivers, pitStop.driverId, "pitStop.driver");
    requireReference(sources, pitStop.sourceId, "pitStop.source");
  }
  for (const stint of fixture.tyreStints) {
    requireReference(sessions, stint.sessionId, "tyreStint.session");
    requireReference(drivers, stint.driverId, "tyreStint.driver");
    requireReference(sources, stint.sourceId, "tyreStint.source");
    if (stint.endLap && stint.startLap > stint.endLap) {
      throw new DomainInvariantError("invalidDateRange", "Tyre stint ends before it begins", { tyreStintId: stint.id });
    }
  }
  for (const event of fixture.raceControlEvents) {
    requireReference(sessions, event.sessionId, "raceControlEvent.session");
    requireReference(sources, event.sourceId, "raceControlEvent.source");
  }
  for (const result of fixture.results) {
    requireReference(sessions, result.sessionId, "result.session");
    requireReference(drivers, result.driverId, "result.driver");
    requireReference(teams, result.teamId, "result.team");
    requireReference(sources, result.sourceId, "result.source");
  }
  for (const standing of fixture.championshipStandings) {
    const grandPrix = requireReference(grandsPrix, standing.afterGrandPrixId, "standing.afterGrandPrix");
    requireReference(seasons, standing.seasonId, "standing.season");
    requireReference(sources, standing.sourceId, "standing.source");
    if (grandPrix.seasonId !== standing.seasonId) {
      throw new DomainInvariantError("mismatchedRelationship", "Standing Grand Prix does not belong to its season", { standingId: standing.id });
    }
    const hasDriver = standing.driverId !== undefined;
    const hasTeam = standing.teamId !== undefined;
    if (hasDriver === hasTeam || (standing.kind === "driver") !== hasDriver) {
      throw new DomainInvariantError("mismatchedRelationship", "Standing must target exactly one entity matching its kind", { standingId: standing.id });
    }
    if (standing.driverId) requireReference(drivers, standing.driverId, "standing.driver");
    if (standing.teamId) requireReference(teams, standing.teamId, "standing.team");
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
      if (connection.targetMomentId === moment.id) {
        throw new DomainInvariantError("mismatchedRelationship", "Moment connection cannot target itself", {
          connectionId: connection.id,
        });
      }
      for (const sourceId of connection.sourceIds) requireReference(sources, sourceId, "connection.source");
    }
    for (const media of moment.media) {
      for (const sourceId of media.sourceIds) requireReference(sources, sourceId, "media.source");
    }
  }

  void explanations;
  void connections;

  const entityIndexes = { season: seasons, circuit: circuits, grandPrix: grandsPrix, session: sessions, race: races, driver: drivers, team: teams, raceMoment: moments, lap: laps, position: positions, pitStop: pitStops, tyreStint: tyreStints, raceControlEvent: raceControlEvents, result: results, championshipStanding: championshipStandings };
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
