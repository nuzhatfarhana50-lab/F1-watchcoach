"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";

import { raceQuestionService } from "@/lib/ai/raceQuestionComposition";
import type { RaceQuestionResponse } from "@/lib/ai/raceQuestionService";
import { logger } from "@/lib/observability/logger";
import { FixedWindowRateLimiter } from "@/lib/security/rateLimiter";

const raceQuestionRateLimiter = new FixedWindowRateLimiter(20, 60_000);

export async function askRaceQuestionAction(input: unknown): Promise<RaceQuestionResponse> {
  try {
    const requestHeaders = await headers();
    const forwardedAddress = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim()
      ?? requestHeaders.get("x-real-ip")
      ?? "anonymous";
    const rateLimitKey = createHash("sha256").update(forwardedAddress).digest("hex");
    if (!raceQuestionRateLimiter.allow(rateLimitKey)) {
      return { status: "unavailable", message: "Too many race questions at once. Wait a minute, then try again." };
    }
    return await raceQuestionService.ask(input);
  } catch (error) {
    logger.error("Race question failed", {
      action: "ask-race-question",
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return {
      status: "unavailable",
      message: "Race answers are temporarily unavailable. The race library is still ready to browse.",
    };
  }
}
