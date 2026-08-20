# F1 Watchcoach

F1 Watchcoach is a race-first learning application that turns real Formula 1 moments into lasting understanding.

Phases 0–7 are complete. The domain, timing, learning-content, AI-generation, embedding, and personal-learning persistence groups are live-verified on the dedicated Neon development project. Normalized provider adapters, public Watch → Learn → Connect journeys, grounded AI workflows, optional authenticated learning memory, replayable live ingestion, observability, and release documentation are implemented, while deterministic fixtures keep local development and CI independent of hosted services.

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

Playwright also verifies the home race-question boundary, the canonical race → moment → concept → connected real moment journey, mobile keyboard navigation, and desktop/mobile visual baselines. Curated-content grounding checks run with:

```bash
npm run eval
```

Deterministic evaluations enforce schema/ID resolution, zero golden-set contradictions, source support, beginner clarity, Recall@5, connection integrity, and media-rights rules. A live model call is deliberately separate:

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
- `/races` for the fixture-backed race library.
- `/races/[season]/[round]` for race context and structured moment previews.
- `/races/[season]/[round]/moments/[moment]` for evidence, attributed media, explanation, concept teaching, a verified related moment, and source tracing.
- `/learning` for authenticated race resumption and teaching preferences.
- `/live/[sessionKey]` for read-only normalized live state.

The pages render on the server and include explicit loading, empty, unsupported-season, provider-unavailable, not-found, and application-error states.

Moment detail is intentionally evidence-first. Missing telemetry is labeled, partial evidence never masquerades as a complete record, media opens only at the attributed rights holder, and related moments resolve from real repository IDs. Browsing remains public. When Clerk is configured, moment learning can be saved through an authenticated Server Action; otherwise the interface shows an explicit non-blocking unavailable state.

## Home race questions

The home screen includes a deliberately constrained race-question interface, not a general-purpose chatbot. Each question is validated and scope-checked before provider lookup or model generation. Non-F1 prompts such as `How to make noodles?` are refused without calling Jolpica or OpenAI.

Questions should identify a season and a Grand Prix, circuit, country, or round. The answer path is:

```text
Question
→ deterministic F1 scope check
→ canonical race/moment lookup
→ Jolpica calendar and result lookup when needed
→ normalized evidence context
→ deterministic factual answer or grounded OpenAI explanation
→ citation-ID resolution
→ attributed source links
```

Canonical races can answer deeper moment, strategy, tyre, and concept questions from curated evidence. Other historical races use the facts available in Jolpica's normalized calendar and classification records; when those records do not establish a tactical cause, the interface says that evidence is insufficient instead of guessing. Factual result questions remain deterministic even when OpenAI is configured. Explanation-style generation is optional, uses only the retrieved context, and falls back to a sourced deterministic answer if the model is unavailable or cites an unknown source. Chat history is browser-local and is not persisted.

The public Server Action validates the 300-character input boundary and applies an ephemeral IP-hashed fixed-window limit. It never logs question text or client addresses.

## Authentication and learning memory

Clerk handles identity only. F1 Watchcoach creates an internal `User` keyed by `externalAuthId` and stores race progress, moment encounters, concept progression, interests, driver/team preferences, explanation depth, and learning style in PostgreSQL. Server Actions derive identity on the server and never accept a user ID from the browser. Repository queries are scoped by compound user keys, and concept progression follows `unseen → encountered → learning → understood → reinforced` without backward or skipped transitions.

Authentication is optional for local development and deterministic CI. Configure both Clerk variables to enable `/sign-in` and saving; configure neither to retain the full anonymous learning journey.

## Grounded AI and workflows

OpenAI access is centralized under `src/lib/ai`. Exact race, moment, concept, source, and connection records are retrieved first. Semantic candidates may be ranked only after structured filtering, and every generated ID or race-question citation is resolved back to an allowed application record. Invalid, unavailable, or invented output falls back to curated grounded content. Repeated stable generations use an idempotency key and cache instead of rerunning on render.

The Responses API requests strict JSON-schema output and Zod validates it again at the application boundary. `text-embedding-3-small` vectors use the approved 1536-dimension pgvector column. Model names remain configurable.

Vercel Workflow compiles explanation and embedding work into durable steps. The internal trigger is `POST /api/internal/ai/explanations`, requires `AI_WORKFLOW_SECRET`, validates a moment UUID, and only enqueues work. It is unavailable by default and never runs during page rendering or deterministic CI.

## Live ingestion

Phase 6 adds a secured `POST /api/ingestion/live` trigger and `GET /api/cron/live` scheduler boundary. Both only start the durable ingestion Workflow; provider fetching, normalized cache publication, moment detection, selective persistence, enrichment, and final publication are separate idempotent checkpoints. `GET /api/live/[sessionKey]` and `/live/[sessionKey]` expose the same serializable live-moment contract as historical moments.

Redis REST stores short-lived session state. PostgreSQL remains authoritative: candidates are persisted only when the OpenF1 session key resolves to a known internal race, and deterministic IDs prevent duplicates on retry. Missing or failed Redis produces an explicit unavailable state; expired checkpoints are labeled stale. OpenF1 signals create event candidates, while AI is reserved for later explanation and never establishes the underlying event truth.

The checked-in Vercel Cron schedule runs every five minutes and therefore requires a Vercel Pro plan. Set `LIVE_SESSION_KEY` only for the intended active race session. Hobby environments should remove or change that schedule before deployment; cron runs only in production.

Workflow 4.8.3 currently brings transitive versions with published nanoid/undici advisories. Scoped npm overrides pin patched releases, and the production build plus deterministic suite verify compatibility. The remaining production audit finding is the documented Prisma CLI/config `deepmerge-ts` advisory.

## Provider boundaries

Jolpica provides calendars, identities, and historical results. OpenF1 provides supported recent sessions, laps, positions, pit stops, stints, race-control events, and optional telemetry. Vendor payloads are validated with Zod and normalized before application code sees them; typed failures distinguish invalid requests, unsupported coverage, rate limiting, service unavailability, and schema drift.

Default race-library composition uses canonical fixtures. The home race-question service checks those fixtures first, then uses the server-only Jolpica adapter to locate and retrieve other historical races. Production adapters never expose vendor shapes to React components. Identical in-flight requests are deduplicated. Historical results cache for 24 hours, recent session metadata for five minutes, and rapidly changing timing evidence for five seconds.

Live provider calls are opt-in and are never part of deterministic CI. Jolpica currently publishes its data under non-commercial terms; review provider licensing before any commercial production use.

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
- `OPENAI_API_KEY`: optional; enables grounded explanation-style home race answers and intentional live generation/evaluation. Results and curated fallbacks work without it.
- `OPENAI_GENERATION_MODEL`: optional, defaults to `gpt-5-mini`.
- `OPENAI_EMBEDDING_MODEL`: optional, defaults to `text-embedding-3-small`.
- `AI_WORKFLOW_SECRET`: optional 32+ character bearer secret for the internal workflow trigger.
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: optional Clerk browser key; must be configured with `CLERK_SECRET_KEY`.
- `CLERK_SECRET_KEY`: optional Clerk server key; never exposed to client code.
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

Deterministic fixtures live under `src/lib/f1/fixtures`. Every factual fixture object, moment, evidence item, explanation, connection, and media reference must identify at least one source. Official embeds and links are stored as metadata; protected F1 footage is never downloaded or rehosted.

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

The five-minute cron in `vercel.json` needs Vercel Pro. Disable or change it for Hobby. Never place deployment tokens, Vercel project metadata secrets, database URLs, or provider keys in source control.

## Troubleshooting

- **Environment validation fails:** compare `.env.local` with `.env.example`; Clerk and Redis values must be supplied as complete pairs, and workflow/cron secrets must meet the documented length.
- **Database operations say `DATABASE_URL` is required:** public fixture browsing still works; configure the intended local/Neon connection only for persistence, migration, or seed commands.
- **A migration is reported as pending after manual Neon promotion:** compare the SQL checksum with `_prisma_migrations`; never reset the database to repair ledger drift.
- **Live timing is unavailable:** verify `LIVE_SESSION_KEY`, Redis connectivity, and a recent successful ingestion Workflow. An expired checkpoint is labeled stale; cache loss never falls through to misleading empty data.
- **An ingestion call returns 401/429/503:** check the bearer secret, bounded trigger rate, and Workflow/provider runtime logs respectively.
- **AI falls back to curated content:** inspect source sufficiency, real-ID resolution, model configuration, and AI validation logs. The fallback is deliberate when grounding is inadequate.
- **A race question is refused or asks for more context:** include a Formula 1 season and Grand Prix, circuit, country, or round. Non-F1 prompts are intentionally blocked before retrieval.
- **A historical race answer is limited:** Jolpica may establish the calendar and classification without explaining strategy or causation. Use a canonical Watchcoach race for deeper sourced teaching, or add curated evidence rather than relying on model memory.
- **Clerk sign-in works but saving fails:** verify `DATABASE_URL`, the Phase 5 migration, and that both Clerk keys belong to the same instance. Domain learning data belongs in PostgreSQL, not Clerk metadata.
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
