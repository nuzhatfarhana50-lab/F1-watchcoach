"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { identityProvider } from "@/lib/auth/identity";
import { getLearningService } from "@/lib/learning/composition";
import { LearningTransitionError } from "@/lib/learning/errors";
import { logger } from "@/lib/observability/logger";

export type LearningActionState =
  | { status: "idle" }
  | { status: "saved"; message: string }
  | { status: "unauthorized"; message: string }
  | { status: "invalid"; message: string }
  | { status: "unavailable"; message: string };

const saveMomentFormSchema = z.object({
  raceId: z.string().uuid(),
  raceMomentId: z.string().uuid(),
  conceptId: z.string().uuid(),
  returnPath: z.string().startsWith("/races/"),
});

export async function saveMomentLearningAction(
  _previousState: LearningActionState,
  formData: FormData,
): Promise<LearningActionState> {
  const parsed = saveMomentFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "invalid", message: "This moment could not be saved." };

  const externalAuthId = await identityProvider.currentExternalUserId();
  if (!externalAuthId) return { status: "unauthorized", message: "Sign in to save this learning." };

  try {
    const service = getLearningService();
    const user = await service.resolveUser(externalAuthId);
    await service.recordMomentEncounter(user.id, { raceMomentId: parsed.data.raceMomentId });
    await service.saveRaceProgress(user.id, {
      raceId: parsed.data.raceId,
      progressPercent: 50,
      lastMomentId: parsed.data.raceMomentId,
    });
    await service.updateConceptState(user.id, {
      conceptId: parsed.data.conceptId,
      state: "ENCOUNTERED",
    });
    revalidatePath(parsed.data.returnPath);
    return { status: "saved", message: "Moment and concept saved to your learning memory." };
  } catch (error) {
    if (error instanceof LearningTransitionError) {
      return { status: "saved", message: "This concept is already further along in your learning memory." };
    }
    logger.error("Learning memory mutation failed", {
      action: "save-moment",
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return { status: "unavailable", message: "Saving is temporarily unavailable. Your public session is unaffected." };
  }
}
