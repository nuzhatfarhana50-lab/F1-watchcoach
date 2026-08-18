import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required to verify canonical fixtures");

const database = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const expectedCounts = {
  seasons: 2,
  circuits: 2,
  grandsPrix: 2,
  sessions: 2,
  races: 2,
  drivers: 4,
  teams: 3,
  teamIdentities: 4,
  memberships: 5,
  laps: 4,
  positions: 3,
  pitStops: 4,
  tyreStints: 4,
  raceControlEvents: 1,
  results: 3,
  championshipStandings: 0,
  moments: 3,
  momentDrivers: 6,
  momentTeams: 6,
  sources: 6,
  momentSources: 5,
  concepts: 2,
  momentConcepts: 3,
  conceptSources: 4,
  explanations: 3,
  explanationConcepts: 3,
  explanationSources: 5,
  media: 3,
  momentMedia: 3,
  mediaSources: 3,
  momentConnections: 2,
  momentConnectionSources: 4,
  externalReferences: 4,
} as const;

try {
  const values = await Promise.all([
    database.season.count(),
    database.circuit.count(),
    database.grandPrix.count(),
    database.session.count(),
    database.race.count(),
    database.driver.count(),
    database.team.count(),
    database.teamSeasonIdentity.count(),
    database.driverTeamMembership.count(),
    database.lap.count(),
    database.position.count(),
    database.pitStop.count(),
    database.tyreStint.count(),
    database.raceControlEvent.count(),
    database.result.count(),
    database.championshipStanding.count(),
    database.raceMoment.count(),
    database.raceMomentDriver.count(),
    database.raceMomentTeam.count(),
    database.source.count(),
    database.raceMomentSource.count(),
    database.concept.count(),
    database.raceMomentConcept.count(),
    database.conceptSource.count(),
    database.explanation.count(),
    database.explanationConcept.count(),
    database.explanationSource.count(),
    database.media.count(),
    database.raceMomentMedia.count(),
    database.mediaSource.count(),
    database.momentConnection.count(),
    database.momentConnectionSource.count(),
    database.externalDataReference.count(),
  ]);
  const actualCounts = Object.fromEntries(Object.keys(expectedCounts).map((key, index) => [key, values[index]]));

  for (const [key, expected] of Object.entries(expectedCounts)) {
    if (actualCounts[key] !== expected) {
      throw new Error(`Canonical seed count mismatch for ${key}: expected ${expected}, received ${actualCounts[key]}`);
    }
  }

  const [integrity] = await database.$queryRaw<[{ invalidRaceRelations: bigint; invalidMomentRelations: bigint; invalidMemberships: bigint; invalidTimingRelations: bigint; invalidContentRelations: bigint; duplicateExternalReferences: bigint; orphanedProvenance: bigint }]>`
    SELECT
      (SELECT count(*) FROM "Race" r LEFT JOIN "GrandPrix" g ON g.id=r."grandPrixId" LEFT JOIN "Session" s ON s.id=r."sessionId" WHERE g.id IS NULL OR s.id IS NULL OR s."grandPrixId"<>r."grandPrixId") AS "invalidRaceRelations",
      (SELECT count(*) FROM "RaceMoment" m LEFT JOIN "Race" r ON r.id=m."raceId" WHERE r.id IS NULL OR r."sessionId"<>m."sessionId") AS "invalidMomentRelations",
      (SELECT count(*) FROM "DriverTeamMembership" m LEFT JOIN "Driver" d ON d.id=m."driverId" LEFT JOIN "Team" t ON t.id=m."teamId" LEFT JOIN "Season" s ON s.id=m."seasonId" WHERE d.id IS NULL OR t.id IS NULL OR s.id IS NULL OR (m."validTo" IS NOT NULL AND m."validTo"<m."validFrom")) AS "invalidMemberships",
      (SELECT count(*) FROM (
        SELECT l.id FROM "Lap" l LEFT JOIN "Session" s ON s.id=l."sessionId" LEFT JOIN "Driver" d ON d.id=l."driverId" LEFT JOIN "Source" src ON src.id=l."sourceId" WHERE s.id IS NULL OR d.id IS NULL OR src.id IS NULL
        UNION ALL SELECT p.id FROM "Position" p LEFT JOIN "Session" s ON s.id=p."sessionId" LEFT JOIN "Driver" d ON d.id=p."driverId" LEFT JOIN "Source" src ON src.id=p."sourceId" WHERE s.id IS NULL OR d.id IS NULL OR src.id IS NULL
        UNION ALL SELECT ps.id FROM "PitStop" ps LEFT JOIN "Session" s ON s.id=ps."sessionId" LEFT JOIN "Driver" d ON d.id=ps."driverId" LEFT JOIN "Source" src ON src.id=ps."sourceId" WHERE s.id IS NULL OR d.id IS NULL OR src.id IS NULL
        UNION ALL SELECT ts.id FROM "TyreStint" ts LEFT JOIN "Session" s ON s.id=ts."sessionId" LEFT JOIN "Driver" d ON d.id=ts."driverId" LEFT JOIN "Source" src ON src.id=ts."sourceId" WHERE s.id IS NULL OR d.id IS NULL OR src.id IS NULL
        UNION ALL SELECT rce.id FROM "RaceControlEvent" rce LEFT JOIN "Session" s ON s.id=rce."sessionId" LEFT JOIN "Source" src ON src.id=rce."sourceId" WHERE s.id IS NULL OR src.id IS NULL
        UNION ALL SELECT r.id FROM "Result" r LEFT JOIN "Session" s ON s.id=r."sessionId" LEFT JOIN "Driver" d ON d.id=r."driverId" LEFT JOIN "Team" t ON t.id=r."teamId" LEFT JOIN "Source" src ON src.id=r."sourceId" WHERE s.id IS NULL OR d.id IS NULL OR t.id IS NULL OR src.id IS NULL
        UNION ALL SELECT cs.id FROM "ChampionshipStanding" cs LEFT JOIN "Season" s ON s.id=cs."seasonId" LEFT JOIN "GrandPrix" gp ON gp.id=cs."afterGrandPrixId" LEFT JOIN "Source" src ON src.id=cs."sourceId" WHERE s.id IS NULL OR gp.id IS NULL OR src.id IS NULL OR gp."seasonId"<>cs."seasonId" OR (cs."kind"='DRIVER' AND cs."driverId" IS NULL) OR (cs."kind"='CONSTRUCTOR' AND cs."teamId" IS NULL)
      ) invalid_timing) AS "invalidTimingRelations",
      (SELECT count(*) FROM (
        SELECT mc."raceMomentId"::text || mc."conceptId"::text AS id FROM "RaceMomentConcept" mc LEFT JOIN "RaceMoment" m ON m.id=mc."raceMomentId" LEFT JOIN "Concept" c ON c.id=mc."conceptId" WHERE m.id IS NULL OR c.id IS NULL
        UNION ALL SELECT e.id::text FROM "Explanation" e LEFT JOIN "RaceMoment" m ON m.id=e."raceMomentId" WHERE m.id IS NULL
        UNION ALL SELECT ec."explanationId"::text || ec."conceptId"::text FROM "ExplanationConcept" ec LEFT JOIN "Explanation" e ON e.id=ec."explanationId" LEFT JOIN "Concept" c ON c.id=ec."conceptId" WHERE e.id IS NULL OR c.id IS NULL
        UNION ALL SELECT rm."raceMomentId"::text || rm."mediaId"::text FROM "RaceMomentMedia" rm LEFT JOIN "RaceMoment" m ON m.id=rm."raceMomentId" LEFT JOIN "Media" media ON media.id=rm."mediaId" WHERE m.id IS NULL OR media.id IS NULL
        UNION ALL SELECT connection.id::text FROM "MomentConnection" connection LEFT JOIN "RaceMoment" source_moment ON source_moment.id=connection."sourceMomentId" LEFT JOIN "RaceMoment" target_moment ON target_moment.id=connection."targetMomentId" WHERE source_moment.id IS NULL OR target_moment.id IS NULL OR connection."sourceMomentId"=connection."targetMomentId"
      ) invalid_content) AS "invalidContentRelations",
      (SELECT count(*) FROM (SELECT provider, "resourceType", "externalId" FROM "ExternalDataReference" GROUP BY provider, "resourceType", "externalId" HAVING count(*)>1) duplicates) AS "duplicateExternalReferences",
      (SELECT count(*) FROM (
        SELECT ms."raceMomentId"::text || ms."sourceId"::text AS id FROM "RaceMomentSource" ms LEFT JOIN "Source" s ON s.id=ms."sourceId" LEFT JOIN "RaceMoment" m ON m.id=ms."raceMomentId" WHERE s.id IS NULL OR m.id IS NULL
        UNION ALL SELECT cs."conceptId"::text || cs."sourceId"::text FROM "ConceptSource" cs LEFT JOIN "Source" s ON s.id=cs."sourceId" LEFT JOIN "Concept" c ON c.id=cs."conceptId" WHERE s.id IS NULL OR c.id IS NULL
        UNION ALL SELECT es."explanationId"::text || es."sourceId"::text FROM "ExplanationSource" es LEFT JOIN "Source" s ON s.id=es."sourceId" LEFT JOIN "Explanation" e ON e.id=es."explanationId" WHERE s.id IS NULL OR e.id IS NULL
        UNION ALL SELECT media_s."mediaId"::text || media_s."sourceId"::text FROM "MediaSource" media_s LEFT JOIN "Source" s ON s.id=media_s."sourceId" LEFT JOIN "Media" media ON media.id=media_s."mediaId" WHERE s.id IS NULL OR media.id IS NULL
        UNION ALL SELECT connection_s."momentConnectionId"::text || connection_s."sourceId"::text FROM "MomentConnectionSource" connection_s LEFT JOIN "Source" s ON s.id=connection_s."sourceId" LEFT JOIN "MomentConnection" connection ON connection.id=connection_s."momentConnectionId" WHERE s.id IS NULL OR connection.id IS NULL
      ) orphaned_provenance) AS "orphanedProvenance"
  `;

  const integrityFailures = Object.fromEntries(Object.entries(integrity).map(([key, value]) => [key, Number(value)]));
  if (Object.values(integrityFailures).some((count) => count !== 0)) {
    throw new Error(`Canonical seed integrity failure: ${JSON.stringify(integrityFailures)}`);
  }

  const deletePolicies = await database.$queryRaw<Array<{ constraintName: string; onDelete: string }>>`
    SELECT conname AS "constraintName", CASE confdeltype
      WHEN 'r' THEN 'RESTRICT'
      WHEN 'c' THEN 'CASCADE'
      ELSE 'UNEXPECTED'
    END AS "onDelete"
    FROM pg_constraint
    WHERE contype='f' AND conname IN (
      'GrandPrix_seasonId_fkey',
      'GrandPrix_circuitId_fkey',
      'RaceMoment_raceId_fkey',
      'DriverTeamMembership_driverId_fkey',
      'RaceMomentSource_sourceId_fkey',
      'ExternalDataReference_raceId_fkey',
      'Lap_sessionId_fkey',
      'Lap_sourceId_fkey',
      'Result_sessionId_fkey',
      'Result_sourceId_fkey',
      'ConceptSource_sourceId_fkey',
      'Explanation_raceMomentId_fkey',
      'ExplanationSource_sourceId_fkey',
      'MediaSource_sourceId_fkey',
      'MomentConnection_targetMomentId_fkey',
      'MomentConnectionSource_sourceId_fkey'
    )
  `;
  const expectedDeletePolicies = {
    DriverTeamMembership_driverId_fkey: "CASCADE",
    ExternalDataReference_raceId_fkey: "CASCADE",
    GrandPrix_circuitId_fkey: "RESTRICT",
    GrandPrix_seasonId_fkey: "CASCADE",
    ConceptSource_sourceId_fkey: "RESTRICT",
    Explanation_raceMomentId_fkey: "CASCADE",
    ExplanationSource_sourceId_fkey: "RESTRICT",
    Lap_sessionId_fkey: "CASCADE",
    Lap_sourceId_fkey: "RESTRICT",
    MediaSource_sourceId_fkey: "RESTRICT",
    MomentConnectionSource_sourceId_fkey: "RESTRICT",
    MomentConnection_targetMomentId_fkey: "CASCADE",
    RaceMomentSource_sourceId_fkey: "RESTRICT",
    RaceMoment_raceId_fkey: "CASCADE",
    Result_sessionId_fkey: "CASCADE",
    Result_sourceId_fkey: "RESTRICT",
  } as const;
  const actualDeletePolicies = Object.fromEntries(deletePolicies.map((policy) => [policy.constraintName, policy.onDelete]));
  for (const [constraintName, expected] of Object.entries(expectedDeletePolicies)) {
    if (actualDeletePolicies[constraintName] !== expected) {
      throw new Error(`Delete policy mismatch for ${constraintName}: expected ${expected}, received ${actualDeletePolicies[constraintName]}`);
    }
  }

  process.stdout.write(`${JSON.stringify({ event: "database.canonical.verify.complete", counts: actualCounts, integrityFailures, deletePolicies: actualDeletePolicies })}\n`);
} finally {
  await database.$disconnect();
}
