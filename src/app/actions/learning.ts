"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { identityProvider } from "@/lib/auth/identity";
import { getLearningService } from "@/lib/learning/composition";
import { LearningTransitionError } from "@/lib/learning/errors";
import { learningPreferencesInputSchema } from "@/lib/learning/schemas";
import { logger } from "@/lib/observability/logger";

export type LearningActionState =
  | { status: "idle" }
  | { status: "saved"; message: string }
  | { status: "unauthorized"; message: string }
  | { status: "invalid"; message: string }
  | { status: "unavailable"; message: string };

async function resolveAuthenticatedUser() {
  const externalAuthId = await identityProvider.currentExternalUserId();
  if (!externalAuthId) return null;
  const service = getLearningService();
  return { service, user: await service.resolveUser(externalAuthId) };
}

export async function saveRaceProgressAction(input: unknown): Promise<LearningActionState> {
  try {
    const context = await resolveAuthenticatedUser();
    if (!context) return { status: "unauthorized", message: "Sign in to save race progress." };
    await context.service.saveRaceProgress(context.user.id, input);
    return { status: "saved", message: "Race progress saved." };
  } catch (error) {
    return mutationFailure("save-race-progress", error);
  }
}

export async function recordMomentEncounterAction(input: unknown): Promise<LearningActionState> {
  try {
    const context = await resolveAuthenticatedUser();
    if (!context) return { status: "unauthorized", message: "Sign in to save this moment." };
    await context.service.recordMomentEncounter(context.user.id, input);
    return { status: "saved", message: "Moment encounter saved." };
  } catch (error) {
    return mutationFailure("record-moment", error);
  }
}

export async function updateConceptStateAction(input: unknown): Promise<LearningActionState> {
  try {
    const context = await resolveAuthenticatedUser();
    if (!context) return { status: "unauthorized", message: "Sign in to update this concept." };
    await context.service.updateConceptState(context.user.id, input);
    return { status: "saved", message: "Concept progress updated." };
  } catch (error) {
    return mutationFailure("update-concept", error);
  }
}

export async function updatePreferencesAction(input: unknown): Promise<LearningActionState> {
  try {
    const context = await resolveAuthenticatedUser();
    if (!context) return { status: "unauthorized", message: "Sign in to update preferences." };
    await context.service.updatePreferences(context.user.id, input);
    return { status: "saved", message: "Learning preferences saved." };
  } catch (error) {
    return mutationFailure("update-preferences", error);
  }
}

export async function updatePreferencesFormAction(
  _previousState: LearningActionState,
  formData: FormData,
): Promise<LearningActionState> {
  const parsed = learningPreferencesInputSchema.safeParse({
    explanationDepth: formData.get("explanationDepth"),
    learningStyle: formData.get("learningStyle"),
    interests: String(formData.get("interests") ?? "").split(",").map((value) => value.trim()).filter(Boolean),
  });
  if (!parsed.success) return { status: "invalid", message: "Check the preference values and try again." };
  return updatePreferencesAction(parsed.data);
}

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

  try {
    const context = await resolveAuthenticatedUser();
    if (!context) return { status: "unauthorized", message: "Sign in to save this learning." };
    const { service, user } = context;
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

function mutationFailure(action: string, error: unknown): LearningActionState {
  if (error instanceof z.ZodError) return { status: "invalid", message: "The submitted values are invalid." };
  if (error instanceof LearningTransitionError) return { status: "invalid", message: error.message };
  logger.error("Learning memory mutation failed", { action, errorName: error instanceof Error ? error.name : "UnknownError" });
  return { status: "unavailable", message: "Learning memory is temporarily unavailable." };
}
