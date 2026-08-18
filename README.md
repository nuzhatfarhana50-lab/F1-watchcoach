# F1 Watchcoach

F1 Watchcoach is a race-first learning application that turns real Formula 1 moments into lasting understanding.

Phase 0 is complete. The approved Phase 1 core and timing-evidence persistence groups are implemented, and their reviewed migrations are applied to the dedicated Neon development project. Hosted services remain optional for deterministic development and CI.

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

## Architecture

The first domain slice follows a contract-first boundary:

```text
Untrusted provider or fixture data
→ Zod schemas and domain invariants
→ normalized race objects
→ repository interface
→ in-memory adapter or Prisma/PostgreSQL
→ application read models
```

The canonical fixture contains the 2024 British Grand Prix and a sourced 2023 Dutch Grand Prix comparison. Core race records plus laps, positions, pit stops, tyre stints, race-control events, and results are persisted with provenance. The standings contract is implemented but intentionally has no canonical rows until a trusted standings source is added. Explanations, concepts, connections, and media references remain fixture-only until their separate schema approval.

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

# Apply pending migrations only after confirming the target database
npm run db:migrate:deploy

# Idempotently load the canonical races after migration
npm run db:seed

# Verify exact canonical counts, relations, provenance, and deletion policies
npm run db:verify:canonical
```

For local migration authoring, `npm run db:migrate:dev` is available, but it must not be pointed at production. Never reset or destructively change a database as part of normal setup. The approved core and timing-evidence migrations are applied to `f1-watchcoach-development`; its connection string is managed outside this repository.

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

The in-memory repository is the default deterministic adapter for tests and CI. The Prisma seed is designed to be rerunnable without duplicating core records, timing evidence, or external references.

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
