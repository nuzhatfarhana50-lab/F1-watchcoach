import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

export class DatabaseConfigurationError extends Error {
  constructor() {
    super("DATABASE_URL is required for database operations");
    this.name = "DatabaseConfigurationError";
  }
}

const globalDatabase = globalThis as typeof globalThis & { f1WatchcoachDatabase?: PrismaClient };

export function getDatabase(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new DatabaseConfigurationError();

  if (!globalDatabase.f1WatchcoachDatabase) {
    globalDatabase.f1WatchcoachDatabase = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  }
  return globalDatabase.f1WatchcoachDatabase;
}
