import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import { seedCanonicalFixtures } from "../src/lib/f1/persistence/seedCanonicalFixtures";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required to seed canonical fixtures");

const database = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

try {
  const result = await seedCanonicalFixtures(database);
  process.stdout.write(`${JSON.stringify({ event: "database.seed.complete", ...result })}\n`);
} finally {
  await database.$disconnect();
}
