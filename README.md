# F1 Watchcoach

F1 Watchcoach is a race-first learning application that turns real Formula 1 moments into lasting understanding.

Production: [f1-watchcoach.vercel.app](https://f1-watchcoach.vercel.app)

Phases 0–7 are complete. The domain, timing, learning-content, AI-generation, embedding, and personal-learning persistence groups are live-verified on the dedicated Neon development project. Normalized provider adapters, a provider-backed race collection, public Watch → Learn → Connect journeys, grounded AI workflows, optional authenticated learning memory, replayable live ingestion, observability, and release documentation are implemented. Deterministic fixtures remain the fallback and keep tests and CI independent of hosted services.

## Local development

Requirements:

- Node.js 20.9 or newer.
- npm 12.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Verification

```bash
npm run verify
```

This validates and generates the Prisma client, runs lint, strict TypeScript checks, deterministic unit/component/schema tests, a production build, and Playwright smoke tests. Production integrations are not required for this gate.

Playwright also verifies the home and floating race-question boundaries, mascot expansion, keyboard focus restoration, the canonical race → moment → concept → connected real moment journey, mobile keyboard navigation, and desktop/mobile visual baselines. Curated-content grounding checks run with:

```bash
npm run eval
```

Deterministic evaluations enforce schema/ID resolution, zero golden-set contradictions, source support, beginner clarity, Recall@5, connection integrity, media-rights rules, F1 scope recall, non-F1 rejection, intent routing, structured-before-web behavior, and citation validity. A live model call is deliberately separate:

```bash
LIVE_OPENAI_EVALS=1 OPENAI_API_KEY=... npm run eval:live
```

The complete deterministic release gate is:

```bash
npm run release:check
```

This runs `verify` and all deterministic evaluations. Live provider/model checks remain opt-in so a clean checkout does not need hosted credentials.

## Architecture

The application follows contract-first boundaries:

```text
Untrusted provider or fixture data
→ Zod schemas and domain invariants
→ normalized race objects
→ repository interface
→ in-memory adapter or Prisma/PostgreSQL
→ application service
→ serializable Server Component read models
```

The canonical fixture contains the 2024 British Grand Prix and a sourced 2023 Dutch Grand Prix comparison. Core race records, timing evidence, concepts, explanations, explicit moment connections, and attributed media metadata are persisted with provenance. The standings contract is implemented but intentionally has no canonical rows until a trusted standings source is added.

Public routes currently include:

- `/` for the product entry point and scoped race-question interface.
- `/races` for the season-selectable Jolpica calendar, OpenF1 coverage indicators, and curated learning races.
- `/races/[season]/[round]` for either a curated Watchcoach learning record or a provider-backed calendar/classification record.
- `/races/[season]/[round]/moments/[moment]` for evidence, attributed media, explanation, concept teaching, a verified related moment, and source tracing.
- `/learning` for authenticated race resumption and teaching preferences.
- `/live/[sessionKey]` for read-only normalized live state.

The pages render on the server and include explicit loading, empty, unsupported-season, provider-unavailable, not-found, and application-error states.

Moment detail is intentionally evidence-first. Missing telemetry is labeled, partial evidence never masquerades as a complete record, media opens only at the attributed rights holder, and related moments resolve from real repository IDs. Browsing remains public. When Clerk is configured, moment learning can be saved through an authenticated Server Action; otherwise the interface shows an explicit non-blocking unavailable state.

## Formula 1 assistant

The home screen includes a Formula 1-only knowledge assistant, not a general-purpose chatbot. The same interface is available site-wide from the floating red/white Watchcoach race-car mascot. Activating the mascot opens a compact panel, focuses its input, preserves the browser-local conversation when collapsed, and returns keyboard focus to the trigger when dismissed with Escape or the close control.

Both surfaces use the same validated Server Action, bounded conversation-reference contract, rate limit, and grounding pipeline. Obvious non-F1 prompts such as `How do I make noodles?` are refused before Jolpica, OpenF1, web search, or answer generation runs.

The assistant accepts questions about F1 drivers, teams, races, circuits, seasons, championships, statistics, strategy, engineering, regulations, FIA decisions, history, transfers, rivalries, controversies, media, and the sport's business. A multi-intent query is not forced into one category. Entity resolution supports common aliases such as `Checo`, `Schumi`, `Merc`, and historical team names, plus bounded one-edit typo tolerance for known driver names (`Verstapen` resolves to `Verstappen`). Drivers outside the curated alias table are resolved against Jolpica's paginated all-time driver directory, so historical names such as Jackie Stewart, Juan Manuel Fangio, Jim Clark, Graham Hill, and Gilles Villeneuve can reach the same structured career pipeline. Driver “qualifications” or credentials are interpreted as career achievements and use structured career facts plus cited trusted-web evidence; explicit qualifying or pole questions route to qualifying statistics. Follow-ups such as “Which teams has he driven for?” receive only recent resolved entity references from the browser-local conversation; factual evidence is retrieved again for every answer.

```text
Question
→ deterministic F1 scope and entity resolution
→ optional scope-only model classification for genuinely ambiguous names
→ Zod-validated multi-intent query plan
→ structured fixtures / RaceMoments / Jolpica
→ retrieval-sufficiency decision
→ trusted-domain Responses web search only when needed
→ grounded answer
→ validated citations and attributed media links
```

Structured questions remain deterministic even when OpenAI is configured. Race winners/classifications come from normalized race results; driver starts, wins, podiums, seasons, and constructor timelines are calculated in code from Jolpica records; canonical moment and media questions use existing Watchcoach evidence first. Statistics that those race rows cannot prove—such as championship counts, poles, fastest laps, DNFs, or career points—continue to cited web evidence. Narrative motives, controversies, business questions, current information, and regulation questions also require retrieved external evidence. They never fall back to model memory when sources are unavailable.

Web retrieval is centralized behind the existing OpenAI Responses adapter; no additional search API or credential is required. One bounded search can inspect the complete allowlist while being instructed to prefer Formula1.com, FIA, and official team domains, then use approved motorsport reporting and Wikidata/Wikipedia only where primary coverage is incomplete. Responses without a trusted citation are rejected. A structured race or career record that does not establish the requested causal or historical detail now continues to web retrieval instead of being treated as a completed answer. The evidence panel shows citations attached to the final answer rather than every page considered during search. Historical web results cache for 24 hours; current queries cache for five minutes. Stable structured answers avoid web search entirely.

The public Server Action validates a 300-character question plus at most six bounded conversation turns and applies an ephemeral IP-hashed fixed-window limit. Answers are instructed to stay within 120 words and have a 1,600-character server safety cap; follow-up requests resend only an 800-character excerpt plus resolved entity references, while factual evidence is retrieved again. It returns only display-safe answer, citation, media, route, and entity-reference fields. Application logging never records question text, client addresses, credentials, or provider payloads; Next.js development Server Function argument logging is also disabled because it would otherwise print prompt text.

## Authentication and learning memory

Clerk handles identity only. F1 Watchcoach creates an internal `User` keyed by `externalAuthId` and stores race progress, moment encounters, concept progression, interests, driver/team preferences, explanation depth, and learning style in PostgreSQL. Server Actions derive identity on the server and never accept a user ID from the browser. Repository queries are scoped by compound user keys, and concept progression follows `unseen → encountered → learning → understood → reinforced` without backward or skipped transitions.

Google OAuth is the only application sign-in method. `/sign-in` starts a fixed `oauth_google` flow, `/sso-callback` completes it, and both new and returning Google users continue to `/learning`. The authenticated learning page calls Clerk's server-side `auth.protect()` before reading internal user data; learning Server Actions independently derive the active Clerk user and fail closed when no session exists. Public race browsing, moments, explanations, and the F1 assistant remain anonymous.

Authentication is optional for deterministic CI. For local development, either configure both Clerk variables or run `npx -y clerk@latest init`; Clerk's keyless bootstrap provisions a claimable development instance and writes its development key pair directly to the ignored `.env.local`. Both Clerk route variables must point to `/sign-in`, because Google handles account creation and returning-user sign-in through the same application control. In the Clerk Dashboard for the matching instance:

1. Enable Google under sign-up/sign-in social connections.
2. Disable email/password, email code/link, phone, passkey, enterprise, and every other social connection so the hosted instance matches the Google-only application boundary.
3. Do not require profile fields that cannot be supplied by Google during the OAuth handoff.
4. For production, configure Clerk's Google connection with the production Google OAuth credentials and the callback/redirect values Clerk provides, then verify the production domain before promotion.

The app never receives a Google client secret directly and exposes no email/password or alternative-provider form. Redirects are fixed local paths rather than browser-supplied destinations, and sign-out returns to the public home page.

## Grounded AI and workflows

OpenAI access is centralized under `src/lib/ai`. Exact race, moment, concept, source, and connection records are retrieved first. Semantic candidates may be ranked only after structured filtering, and every generated ID or race-question citation is resolved back to an allowed application record. Invalid, unavailable, or invented output falls back to curated grounded content. Repeated stable generations use an idempotency key and cache instead of rerunning on render.

The Responses API requests strict JSON-schema output and Zod validates it again at the application boundary. `text-embedding-3-small` vectors use the approved 1536-dimension pgvector column. Model names remain configurable.

Vercel Workflow compiles explanation and embedding work into durable steps. The internal trigger is `POST /api/internal/ai/explanations`, requires `AI_WORKFLOW_SECRET`, validates a moment UUID, and only enqueues work. It is unavailable by default and never runs during page rendering or deterministic CI.

## Live ingestion

Phase 6 adds a secured `POST /api/ingestion/live` trigger and `GET /api/cron/live` scheduler boundary. Both only start the durable ingestion Workflow; provider fetching, normalized cache publication, moment detection, selective persistence, enrichment, and final publication are separate idempotent checkpoints. `GET /api/live/[sessionKey]` and `/live/[sessionKey]` expose the same serializable live-moment contract as historical moments.

Redis REST stores short-lived session state. PostgreSQL remains authoritative: candidates are persisted only when the OpenF1 session key resolves to a known internal race, and deterministic IDs prevent duplicates on retry. Missing or failed Redis produces an explicit unavailable state; expired checkpoints are labeled stale. OpenF1 signals create event candidates, while AI is reserved for later explanation and never establishes the underlying event truth.

The checked-in Vercel Cron schedule runs once daily at 00:00 UTC so it remains compatible with the Vercel Hobby plan. Set `LIVE_SESSION_KEY` only for an intended active session. Race-frequency ingestion requires a Pro-plan schedule or explicit secured trigger calls; cron runs only in production.

Workflow 4.8.3 currently brings transitive versions with published nanoid/undici advisories. Scoped npm overrides pin patched releases, and the production build plus deterministic suite verify compatibility. The remaining production audit finding is the documented Prisma CLI/config `deepmerge-ts` advisory.

## Provider boundaries

Jolpica provides calendars, the paginated all-time driver directory, historical race results, driver career-result timelines, and driver standings. The directory and driver careers follow Jolpica's documented 100-record maximum through bounded sequential pagination before identity matching, totals, or team timelines are calculated. Pages are cached for 24 hours and the application stays below the provider's documented burst limit. OpenF1 provides supported recent sessions, laps, positions, pit stops, stints, race-control events, and optional telemetry. Vendor payloads are validated with Zod and normalized before application code sees them; typed failures distinguish invalid requests, unsupported coverage, rate limiting, service unavailability, and schema drift.

The `/races` Server Component reads a requested `?season=YYYY` at request time. Its heading and season shell stream immediately; provider-backed cards load behind a Suspense boundary so a slow or unavailable OpenF1 request cannot block historical navigation. Jolpica is the authoritative round list from 1950 through the current season. For seasons from 2023 onward, the catalog matches non-cancelled OpenF1 Grand Prix sessions by race date and exposes whether detailed timing exists. OpenF1 Sprint sessions are deliberately excluded. Provider-only cards open an internal race record with a normalized Jolpica classification and direct provenance links; they do not pretend that a curated explanation exists.

If Jolpica fails, a selected season falls back only to verified Watchcoach fixtures already in that season. If no trusted record exists, the UI shows an unavailable state rather than an empty or invented calendar. The 2024 British GP and 2023 Dutch GP remain visible as learning records even when live providers are unavailable. The home race-question service also checks those fixtures first, then uses the server-only Jolpica adapter to locate and retrieve other historical races. Production adapters never expose vendor shapes to React components. Identical in-flight requests are deduplicated. Historical calendar/results cache for 24 hours, recent session metadata for five minutes, and rapidly changing timing evidence for five seconds.

Public historical catalog reads require no API key and run when `/races` or a provider-only detail is requested. Their adapter, merge, fallback, and rendering behavior is covered by deterministic fixtures; the explicit live smoke command remains outside CI. Jolpica and OpenF1 publish non-commercial/personal-use terms, so review both providers' current licensing before any commercial production use.

Run the separate smoke harness only when network-backed provider verification is intentional:

```bash
LIVE_F1_PROVIDER_TESTS=1 npm run test:integration:live
```

## Database workflow

Prisma 7 uses PostgreSQL through the `pg` driver adapter. `DATABASE_URL` is consumed only by database operations and should point at the intended development database.

```bash
# Safe, offline checks
npm run db:validate
npm run db:generate

# Review all pending SQL before any application
prisma/migrations/20260817173000_phase1_core/migration.sql
prisma/migrations/20260818193000_phase1_timing_evidence_types/migration.sql
prisma/migrations/20260818193100_phase1_timing_evidence/migration.sql
prisma/migrations/20260818195500_phase1_learning_content/migration.sql
prisma/migrations/20260818221000_phase4_ai_metadata/migration.sql
prisma/migrations/20260818234500_phase5_learning_memory/migration.sql

# Apply pending migrations only after confirming the target database
npm run db:migrate:deploy

# Idempotently load the canonical races after migration
npm run db:seed

# Verify exact canonical counts, relations, provenance, and deletion policies
npm run db:verify:canonical
```

For local migration authoring, `npm run db:migrate:dev` is available, but it must not be pointed at production. Never reset or destructively change a database as part of normal setup. All listed migrations are applied to `f1-watchcoach-development`; its connection string is managed outside this repository.

Current development-database status: schema, Prisma migration history, canonical seed idempotency, relations, provenance, and deletion policies are verified. Canonical seeds use explicit bounded transaction limits to accommodate remote Neon startup and write latency without changing application-wide transaction behavior.

The evidence migration is deliberately split: PostgreSQL must commit new enum values before a later constraint can reference them. Keep both migrations in timestamp order. Rollback is forward-only: if an applied migration needs correction, create and review a compensating migration rather than resetting the database.

## Environment

Copy `.env.example` to `.env.local`. Current variables are:

- `DATABASE_URL`: PostgreSQL connection string, required only for migration, seed, and database-backed application operations.
- `LOG_LEVEL`: optional structured log threshold (`debug`, `info`, `warn`, or `error`).
- `F1_PROVIDER_MODE`: `live` by default; use `fixtures` only for deterministic tests or intentional offline regression work.
- `OPENAI_API_KEY`: optional; enables ambiguous F1 scope classification, trusted-domain web grounding for narrative/current questions, grounded race explanations, and intentional live generation/evaluation. Structured results and curated fallbacks work without it.
- `OPENAI_GENERATION_MODEL`: optional, defaults to `gpt-5-mini`.
- `OPENAI_EMBEDDING_MODEL`: optional, defaults to `text-embedding-3-small`.
- `AI_WORKFLOW_SECRET`: optional 32+ character bearer secret for the internal workflow trigger.
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: optional Clerk browser key for the Google-only sign-in flow; must be configured with `CLERK_SECRET_KEY`.
- `CLERK_SECRET_KEY`: optional Clerk server key from the same Clerk instance; never exposed to client code.
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL` and `NEXT_PUBLIC_CLERK_SIGN_UP_URL`: both `/sign-in`; new Google users and returning users share one OAuth entry point.
- `INGESTION_SECRET`: optional 32+ character bearer secret for manual live-ingestion triggers.
- `CRON_SECRET`: optional 32+ character bearer secret automatically sent by Vercel Cron.
- `REDIS_REST_URL` and `REDIS_REST_TOKEN`: optional pair for shared ephemeral live state; in-memory state is used only for deterministic/local composition.
- `LIVE_SESSION_KEY`: optional positive OpenF1 session key used by the cron trigger.

Do not commit `.env.local` or credentials.

Production environment matrix:

| Capability | Required variables | Preview | Production |
| --- | --- | --- | --- |
| Public fixture learning | `LOG_LEVEL` only | Required baseline | Required baseline |
| PostgreSQL persistence | `DATABASE_URL` | Development/preview branch | Production branch only after reviewed migrations |
| Grounded OpenAI | `OPENAI_API_KEY`, model variables, `AI_WORKFLOW_SECRET` | Optional smoke environment | Required to enable generated explanations |
| Personal memory | Clerk key pair + `DATABASE_URL` | Use Clerk test instance | Use Clerk production instance |
| Live state | Redis pair + `INGESTION_SECRET` | Optional replay/smoke | Required for shared live state |
| Scheduled ingestion | `CRON_SECRET`, `LIVE_SESSION_KEY` | Cron does not run | Set only during intended live sessions |

Optional pairs are validated together at startup. Configuration failures report variable names, never values.

The current Prisma CLI transitively includes `deepmerge-ts@7.1.5`, which npm flags for recursive-input stack exhaustion. It is reached through Prisma's build-time configuration path; npm's proposed automatic fix is a breaking Prisma downgrade, so it is not applied. Recheck this advisory when Prisma publishes a compatible update.

## Fixture and provenance rules

Deterministic fixtures live under `src/lib/f1/fixtures`. Every factual fixture object, moment, evidence item, explanation, connection, and media reference must identify at least one source. Official embeds and links are stored as metadata; protected F1 footage is never downloaded or rehosted. The Watchcoach mascot is an application-owned generated asset with an original logo-free vehicle design, rather than copied team branding.

The in-memory repository is the default deterministic adapter for tests and CI. The Prisma seed is designed to be rerunnable without duplicating core records, timing evidence, learning content, source relationships, or external references.

The release regression set covers dry strategy, mixed weather, Safety Car/red flag, and incident-heavy timelines. These reduced replay fixtures test detector behavior and are not presented as full race records.

## Media rights

Store media references and attribution, not protected race binaries. Use official/publicly embeddable Formula 1, FIA, team, driver, YouTube, Wikimedia, or otherwise licensed sources. Never download or rehost protected footage, bypass platform restrictions, remove attribution, or use Vercel Blob as a rights workaround. If an embed becomes unavailable, show the explicit media-unavailable state while preserving sourced structured evidence.

## Observability and diagnostics

Critical API routes emit structured start/completion/failure logs containing route, request ID, outcome, status, and duration. Secret-like keys are redacted by the logger. Vercel Web Analytics and Speed Insights are mounted in the root layout, and server instrumentation records runtime/environment startup without credentials.

Use the Vercel deployment Logs tab for runtime failures and the Analytics/Speed Insights dashboards for route performance. On Pro/Enterprise, configure a signed Vercel Drain for centralized logs/traces; the repository does not create an external drain automatically. Before production promotion, verify provider failures, Workflow retries, Redis availability, database errors, and p95 route latency in the dashboard.

## Deployment

Deployment is intentionally not automatic from this repository. GitHub Actions runs the same deterministic `npm run verify` gate on pushes and pull requests. A safe Vercel release sequence is:

1. Create/link the Vercel project and provision preview environment variables from the matrix above.
2. Apply reviewed Prisma migrations to the intended preview database, then run the idempotent seed and canonical verification.
3. Run `npm run release:check` locally and in CI.
4. Let Vercel create a preview deployment and exercise anonymous learning, Clerk persistence, personalization, the secured ingestion boundary, and recorded live replay.
5. Confirm Web Analytics/Speed Insights and structured runtime logs are receiving data.
6. Apply the same reviewed migrations to the intended production database.
7. Promote the already verified preview artifact only with explicit deployment approval.
8. Scan production runtime errors immediately after promotion; roll back the alias if the release gate regresses.

The daily cron in `vercel.json` is Hobby-compatible. Race-frequency scheduling requires Vercel Pro; the secured manual trigger remains available. Never place deployment tokens, Vercel project metadata secrets, database URLs, or provider keys in source control.

## Troubleshooting

- **Environment validation fails:** compare `.env.local` with `.env.example`; Clerk and Redis values must be supplied as complete pairs, and workflow/cron secrets must meet the documented length.
- **Database operations say `DATABASE_URL` is required:** public fixture browsing still works; configure the intended local/Neon connection only for persistence, migration, or seed commands.
- **A migration is reported as pending after manual Neon promotion:** compare the SQL checksum with `_prisma_migrations`; never reset the database to repair ledger drift.
- **Live timing is unavailable:** verify `LIVE_SESSION_KEY`, Redis connectivity, and a recent successful ingestion Workflow. An expired checkpoint is labeled stale; cache loss never falls through to misleading empty data.
- **An ingestion call returns 401/429/503:** check the bearer secret, bounded trigger rate, and Workflow/provider runtime logs respectively.
- **AI falls back to curated content:** inspect source sufficiency, real-ID resolution, model configuration, and AI validation logs. The fallback is deliberate when grounding is inadequate.
- **A legitimate F1 question asks for more evidence:** configure `OPENAI_API_KEY` when the answer requires current or narrative web sources. Simple race results, driver career totals, and canonical moments remain available from structured data without it.
- **A Formula 1 question is refused:** include the Formula 1 relationship when a name or phrase is genuinely ambiguous. Historical driver names are resolved through Jolpica's all-time directory, while ambiguous unknown people use the optional scope-only classifier; non-F1 prompts remain intentionally blocked before factual retrieval.
- **A historical race answer is limited:** Jolpica establishes calendars, classifications, and driver records; strategy, causation, controversies, and other narrative detail continue to trusted web evidence rather than model memory. If that external search times out, the response explicitly reports temporary source unavailability so the question can be retried.
- **A season catalog is unavailable:** retry the request, confirm outbound access to `api.jolpi.ca`, and inspect the structured `Race catalog provider unavailable` log. Verified Watchcoach races remain available as fallback; OpenF1 failure removes only the timing-coverage indicator.
- **Clerk sign-in works but saving fails:** verify `DATABASE_URL`, the Phase 5 migration, and that both Clerk keys belong to the same instance. Domain learning data belongs in PostgreSQL, not Clerk metadata.
- **The Sign in control is missing locally:** run `npx -y clerk@latest init` to create a claimable development instance, then restart `npm run dev`. The CLI writes keys to `.env.local`; do not copy them into source files.
- **Google is missing or another sign-in method appears:** open the matching Clerk instance's sign-up/sign-in settings, enable Google, and disable every other authentication strategy. The application deliberately renders only its Google button, but production provider availability is controlled by Clerk Dashboard configuration.
- **Google returns to an OAuth error:** verify the Clerk instance/domain, the custom Google OAuth credentials in production, and the callback URI displayed by Clerk. Do not place Google OAuth secrets in `NEXT_PUBLIC_*` variables or repository files.
- **Playwright cannot find Chromium:** run `npx playwright install chromium`, then retry `npm run test:e2e`.
- **`npm audit` reports `deepmerge-ts`:** this is the documented Prisma CLI/config transitive advisory; do not apply npm's breaking forced downgrade. Re-evaluate when a compatible Prisma release is available.

## Command reference

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start local Next.js development |
| `npm run lint` | Enforce ESLint with zero warnings |
| `npm run typecheck` | Run strict TypeScript checking |
| `npm test` | Run deterministic unit/component/schema tests |
| `npm run test:e2e` | Run Playwright journeys and visual baselines |
| `npm run build` | Generate Prisma and build the production application/Workflows |
| `npm run verify` | Run the shared local/CI quality gate |
| `npm run eval` | Run deterministic grounding/retrieval/detection evaluations |
| `npm run release:check` | Run the full deterministic release gate |
| `npm run test:integration:live` | Run opt-in live F1 provider smoke tests |
| `npm run eval:live` | Run the opt-in live OpenAI evaluation |
| `npm run db:seed` | Idempotently seed canonical sourced records |
| `npm run db:verify:canonical` | Verify canonical database counts and invariants |

## Product loop

```text
REAL RACE MOMENT
      ↓
WHAT HAPPENED?
      ↓
WHY DID IT HAPPEN?
      ↓
WHAT CONCEPT DOES IT TEACH?
      ↓
WHAT SHOULD THE USER NOTICE NEXT TIME?
      ↓
SAVE WHAT THE USER LEARNED
```

See `AGENTS.md` for the product, architecture, safety, media-rights, implementation rules, and current build ledger.
