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
  moments: 3,
  momentDrivers: 6,
  momentTeams: 6,
  sources: 6,
  momentSources: 5,
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
    database.raceMoment.count(),
    database.raceMomentDriver.count(),
    database.raceMomentTeam.count(),
    database.source.count(),
    database.raceMomentSource.count(),
    database.externalDataReference.count(),
  ]);
  const actualCounts = Object.fromEntries(Object.keys(expectedCounts).map((key, index) => [key, values[index]]));

  for (const [key, expected] of Object.entries(expectedCounts)) {
    if (actualCounts[key] !== expected) {
      throw new Error(`Canonical seed count mismatch for ${key}: expected ${expected}, received ${actualCounts[key]}`);
    }
  }

  const [integrity] = await database.$queryRaw<[{ invalidRaceRelations: bigint; invalidMomentRelations: bigint; invalidMemberships: bigint; duplicateExternalReferences: bigint; orphanedProvenance: bigint }]>`
    SELECT
      (SELECT count(*) FROM "Race" r LEFT JOIN "GrandPrix" g ON g.id=r."grandPrixId" LEFT JOIN "Session" s ON s.id=r."sessionId" WHERE g.id IS NULL OR s.id IS NULL OR s."grandPrixId"<>r."grandPrixId") AS "invalidRaceRelations",
      (SELECT count(*) FROM "RaceMoment" m LEFT JOIN "Race" r ON r.id=m."raceId" WHERE r.id IS NULL OR r."sessionId"<>m."sessionId") AS "invalidMomentRelations",
      (SELECT count(*) FROM "DriverTeamMembership" m LEFT JOIN "Driver" d ON d.id=m."driverId" LEFT JOIN "Team" t ON t.id=m."teamId" LEFT JOIN "Season" s ON s.id=m."seasonId" WHERE d.id IS NULL OR t.id IS NULL OR s.id IS NULL OR (m."validTo" IS NOT NULL AND m."validTo"<m."validFrom")) AS "invalidMemberships",
      (SELECT count(*) FROM (SELECT provider, "resourceType", "externalId" FROM "ExternalDataReference" GROUP BY provider, "resourceType", "externalId" HAVING count(*)>1) duplicates) AS "duplicateExternalReferences",
      (SELECT count(*) FROM "RaceMomentSource" ms LEFT JOIN "Source" s ON s.id=ms."sourceId" LEFT JOIN "RaceMoment" m ON m.id=ms."raceMomentId" WHERE s.id IS NULL OR m.id IS NULL) AS "orphanedProvenance"
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
      'ExternalDataReference_raceId_fkey'
    )
  `;
  const expectedDeletePolicies = {
    DriverTeamMembership_driverId_fkey: "CASCADE",
    ExternalDataReference_raceId_fkey: "CASCADE",
    GrandPrix_circuitId_fkey: "RESTRICT",
    GrandPrix_seasonId_fkey: "CASCADE",
    RaceMomentSource_sourceId_fkey: "RESTRICT",
    RaceMoment_raceId_fkey: "CASCADE",
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
