"use client";

import { useActionState } from "react";

import { type LearningActionState, updatePreferencesFormAction } from "@/app/actions/learning";

export function LearningPreferencesForm({ depth, style }: { depth: string; style: string }) {
  const [state, action, pending] = useActionState<LearningActionState, FormData>(updatePreferencesFormAction, { status: "idle" });
  return (
    <form action={action} className="preferences-form">
      <label>Explanation depth<select name="explanationDepth" defaultValue={depth}><option value="BEGINNER">Beginner</option><option value="STANDARD">Standard</option><option value="DETAILED">Detailed</option></select></label>
      <label>Learning style<select name="learningStyle" defaultValue={style}><option value="BALANCED">Balanced</option><option value="VISUAL">Visual</option><option value="TECHNICAL">Technical</option></select></label>
      <label>Topics of interest<input name="interests" placeholder="strategy, tyres, racecraft" /></label>
      <button type="submit" disabled={pending}>{pending ? "Saving…" : "Save preferences"}</button>
      {state.status !== "idle" ? <p role="status">{state.message}</p> : null}
    </form>
  );
}
