import "server-only";

import { serverEnvironment } from "@/lib/env/server";

import { InMemoryLiveStateCache, RedisRestLiveStateCache } from "./cache";
import { LiveSessionService } from "./liveSessionService";
import { PrismaLiveMomentPersistence } from "./persistence";

const cache = serverEnvironment.REDIS_REST_URL && serverEnvironment.REDIS_REST_TOKEN
  ? new RedisRestLiveStateCache(serverEnvironment.REDIS_REST_URL, serverEnvironment.REDIS_REST_TOKEN)
  : new InMemoryLiveStateCache();

export const liveSessionService = new LiveSessionService(cache);
export const liveMomentPersistence = new PrismaLiveMomentPersistence();
