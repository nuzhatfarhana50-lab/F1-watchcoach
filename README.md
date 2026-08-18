# F1 Watchcoach

F1 Watchcoach is a race-first learning application that turns real Formula 1 moments into lasting understanding.

Phases 0–5 are complete. The domain, timing, learning-content, AI-generation, embedding, and personal-learning persistence groups are live-verified on the dedicated Neon development project. Normalized provider adapters, public Watch → Learn → Connect journeys, grounded AI workflows, and optional authenticated learning memory are implemented, while deterministic fixtures keep local development and CI independent of hosted services.

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

Playwright also verifies the canonical race → moment → concept → connected real moment journey, mobile keyboard navigation, and desktop/mobile visual baselines. Curated-content grounding checks run with:

```bash
npm run eval
```

Deterministic evaluations enforce schema/ID resolution, zero golden-set contradictions, source support, beginner clarity, Recall@5, connection integrity, and media-rights rules. A live model call is deliberately separate:

```bash
LIVE_OPENAI_EVALS=1 OPENAI_API_KEY=... npm run eval:live
```

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

- `/races` for the fixture-backed race library.
- `/races/[season]/[round]` for race context and structured moment previews.
- `/races/[season]/[round]/moments/[moment]` for evidence, attributed media, explanation, concept teaching, a verified related moment, and source tracing.

The pages render on the server and include explicit loading, empty, unsupported-season, provider-unavailable, not-found, and application-error states.

Moment detail is intentionally evidence-first. Missing telemetry is labeled, partial evidence never masquerades as a complete record, media opens only at the attributed rights holder, and related moments resolve from real repository IDs. Browsing remains public. When Clerk is configured, moment learning can be saved through an authenticated Server Action; otherwise the interface shows an explicit non-blocking unavailable state.

## Authentication and learning memory

Clerk handles identity only. F1 Watchcoach creates an internal `User` keyed by `externalAuthId` and stores race progress, moment encounters, concept progression, interests, driver/team preferences, explanation depth, and learning style in PostgreSQL. Server Actions derive identity on the server and never accept a user ID from the browser. Repository queries are scoped by compound user keys, and concept progression follows `unseen → encountered → learning → understood → reinforced` without backward or skipped transitions.

Authentication is optional for local development and deterministic CI. Configure both Clerk variables to enable `/sign-in` and saving; configure neither to retain the full anonymous learning journey.

## Grounded AI and workflows

OpenAI access is centralized under `src/lib/ai`. Exact moment, concept, source, and connection records are retrieved first. Semantic candidates may be ranked only after structured filtering, and every generated ID is resolved back to an allowed application record. Invalid, unavailable, or invented output falls back to curated grounded content. Repeated stable generations use an idempotency key and cache instead of rerunning on render.

The Responses API requests strict JSON-schema output and Zod validates it again at the application boundary. `text-embedding-3-small` vectors use the approved 1536-dimension pgvector column. Model names remain configurable.

Vercel Workflow compiles explanation and embedding work into durable steps. The internal trigger is `POST /api/internal/ai/explanations`, requires `AI_WORKFLOW_SECRET`, validates a moment UUID, and only enqueues work. It is unavailable by default and never runs during page rendering or deterministic CI.

## Live ingestion

Phase 6 adds a secured `POST /api/ingestion/live` trigger and `GET /api/cron/live` scheduler boundary. Both only start the durable ingestion Workflow; provider fetching, normalized cache publication, moment detection, selective persistence, enrichment, and final publication are separate idempotent checkpoints. `GET /api/live/[sessionKey]` and `/live/[sessionKey]` expose the same serializable live-moment contract as historical moments.

Redis REST stores short-lived session state. PostgreSQL remains authoritative: candidates are persisted only when the OpenF1 session key resolves to a known internal race, and deterministic IDs prevent duplicates on retry. Missing or failed Redis produces an explicit unavailable state; expired checkpoints are labeled stale. OpenF1 signals create event candidates, while AI is reserved for later explanation and never establishes the underlying event truth.

The checked-in Vercel Cron schedule runs every five minutes and therefore requires a Vercel Pro plan. Set `LIVE_SESSION_KEY` only for the intended active race session. Hobby environments should remove or change that schedule before deployment; cron runs only in production.

Workflow 4.8.3 currently brings transitive versions with published nanoid/undici advisories. Scoped npm overrides pin patched releases, and the production build plus deterministic suite verify compatibility. The remaining production audit finding is the documented Prisma CLI/config `deepmerge-ts` advisory.

## Provider boundaries

Jolpica provides calendars, identities, and historical results. OpenF1 provides supported recent sessions, laps, positions, pit stops, stints, race-control events, and optional telemetry. Vendor payloads are validated with Zod and normalized before application code sees them; typed failures distinguish invalid requests, unsupported coverage, rate limiting, service unavailability, and schema drift.

Default UI composition uses canonical fixtures. Production adapters are wired at a server-only boundary and can be activated by later ingestion work without exposing vendor shapes to React components. Identical in-flight requests are deduplicated. Historical results cache for 24 hours, recent session metadata for five minutes, and rapidly changing timing evidence for five seconds.

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

For local migration authoring, `npm run db:migrate:dev` is available, but it must not be pointed at production. Never reset or destructively change a database as part of normal setup. All Phase 1 migrations are applied to `f1-watchcoach-development`; its connection string is managed outside this repository.

Current development-database status: schema, Prisma migration history, canonical seed idempotency, relations, provenance, and deletion policies are verified. Canonical seeds use explicit bounded transaction limits to accommodate remote Neon startup and write latency without changing application-wide transaction behavior.

The evidence migration is deliberately split: PostgreSQL must commit new enum values before a later constraint can reference them. Keep both migrations in timestamp order. Rollback is forward-only: if an applied migration needs correction, create and review a compensating migration rather than resetting the database.

## Environment

Copy `.env.example` to `.env.local`. Current variables are:

- `DATABASE_URL`: PostgreSQL connection string, required only for migration, seed, and database-backed application operations.
- `LOG_LEVEL`: optional structured log threshold (`debug`, `info`, `warn`, or `error`).
- `OPENAI_API_KEY`: optional; required only for intentional live generation/evaluation.
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

The current Prisma CLI transitively includes `deepmerge-ts@7.1.5`, which npm flags for recursive-input stack exhaustion. It is reached through Prisma's build-time configuration path; npm's proposed automatic fix is a breaking Prisma downgrade, so it is not applied. Recheck this advisory when Prisma publishes a compatible update.

## Fixture and provenance rules

Deterministic fixtures live under `src/lib/f1/fixtures`. Every factual fixture object, moment, evidence item, explanation, connection, and media reference must identify at least one source. Official embeds and links are stored as metadata; protected F1 footage is never downloaded or rehosted.

The in-memory repository is the default deterministic adapter for tests and CI. The Prisma seed is designed to be rerunnable without duplicating core records, timing evidence, learning content, source relationships, or external references.

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

See `AGENTS.md` for the product, architecture, safety, media-rights, and implementation rules.
