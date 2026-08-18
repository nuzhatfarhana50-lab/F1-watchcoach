import Link from "next/link";

import { LearningPreferencesForm } from "@/app/_components/learning-preferences-form";
import { SiteHeader } from "@/app/_components/site-header";
import { isClerkConfigured } from "@/lib/auth/configuration";
import { identityProvider } from "@/lib/auth/identity";
import { getRaceLibraryService } from "@/lib/f1/application/composition";
import { getLearningService } from "@/lib/learning/composition";

export const dynamic = "force-dynamic";

export default async function LearningPage() {
  if (!isClerkConfigured()) return <Frame><Unavailable message="Authentication is not configured in this environment." /></Frame>;
  const externalAuthId = await identityProvider.currentExternalUserId();
  if (!externalAuthId) return <Frame><Unavailable message="Sign in to save and resume your learning." signIn /></Frame>;

  let data: Awaited<ReturnType<typeof loadLearningPage>> | null = null;
  try {
    data = await loadLearningPage(externalAuthId);
  } catch {
    return <Frame><Unavailable message="Personal learning memory is temporarily unavailable. Public race learning still works." /></Frame>;
  }

  const { snapshot, races } = data;
  const raceById = new Map(races.map((race) => [race.id, race]));
  return (
    <Frame>
      <header className="moment-hero">
        <div className="moment-hero-meta"><span>Personal learning memory</span></div>
        <h1>Continue learning</h1>
        <p>Your race progress and concept context stay in the F1 Watchcoach datastore.</p>
      </header>
      <section className="moment-list" aria-labelledby="resume-title">
        <div><p className="section-label">Resume</p><h2 id="resume-title">Race progress</h2></div>
        {snapshot.raceProgress.length === 0 ? <p role="status">No saved race progress yet.</p> : snapshot.raceProgress.map((progress) => {
          const race = raceById.get(progress.raceId);
          return <article className="race-card" key={progress.raceId}><h3>{race?.name ?? "Saved race"}</h3><p>{progress.progressPercent}% complete</p>{race ? <Link href={race.href}>Resume race</Link> : null}</article>;
        })}
      </section>
      <section className="sources-section" aria-labelledby="preferences-title">
        <div><p className="section-label">Preferences</p><h2 id="preferences-title">How should the coach teach?</h2></div>
        <LearningPreferencesForm depth={snapshot.user.explanationDepth} style={snapshot.user.learningStyle} />
      </section>
    </Frame>
  );
}

async function loadLearningPage(externalAuthId: string) {
    const service = getLearningService();
    const user = await service.resolveUser(externalAuthId);
    const [snapshot, races] = await Promise.all([service.getSnapshot(user.id), (await getRaceLibraryService()).listRaces()]);
  return { snapshot, races };
}

function Frame({ children }: { children: React.ReactNode }) {
  return <main id="main-content" className="app-shell"><SiteHeader />{children}</main>;
}

function Unavailable({ message, signIn = false }: { message: string; signIn?: boolean }) {
  return <section className="empty-state" role="status"><h1>Learning memory unavailable</h1><p>{message}</p>{signIn ? <Link href="/sign-in">Sign in</Link> : <Link href="/races">Browse races</Link>}</section>;
}
