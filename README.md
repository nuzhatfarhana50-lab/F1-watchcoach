# F1 Watchcoach

F1 Watchcoach is a race-first learning application that turns real Formula 1 moments into lasting understanding.

Phases 0–3 are complete. The core, timing-evidence, and learning-content persistence groups are live-verified on the dedicated Neon development project. Normalized provider adapters, the public race library, and the canonical Watch → Learn → Connect experience are implemented, while deterministic fixtures keep local development and CI independent of hosted services.

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

Moment detail is intentionally evidence-first. Missing telemetry is labeled, partial evidence never masquerades as a complete record, media opens only at the attributed rights holder, and related moments resolve from real repository IDs. Browsing remains public; the saving prompt is non-interactive until authenticated learning memory is implemented in Phase 5.

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
