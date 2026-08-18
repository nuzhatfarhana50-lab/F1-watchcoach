"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  saveMomentLearningAction,
  type LearningActionState,
} from "@/app/actions/learning";

const initialState: LearningActionState = { status: "idle" };

export function SaveLearningControl({
  raceId,
  momentId,
  conceptId,
  returnPath,
}: {
  raceId: string;
  momentId: string;
  conceptId: string;
  returnPath: string;
}) {
  const [state, action, pending] = useActionState(saveMomentLearningAction, initialState);
  return (
    <aside className="save-prompt" aria-label="Save learning">
      <div>
        <strong>Remember this concept</strong>
        <p>{state.status === "idle" ? "Save the moment and continue learning from here next time." : state.message}</p>
        {state.status === "unauthorized" ? <Link href="/sign-in">Sign in to continue</Link> : null}
      </div>
      <form action={action}>
        <input type="hidden" name="raceId" value={raceId} />
        <input type="hidden" name="raceMomentId" value={momentId} />
        <input type="hidden" name="conceptId" value={conceptId} />
        <input type="hidden" name="returnPath" value={returnPath} />
        <button type="submit" disabled={pending}>{pending ? "Saving…" : "Save learning"}</button>
      </form>
    </aside>
  );
}
