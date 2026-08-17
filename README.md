# F1 Watchcoach

F1 Watchcoach is a race-first learning application that turns real Formula 1 moments into lasting understanding.

Phase 0, the project and quality foundation, is complete. Phase 1 is blocked on the required database-schema approval. The setup, architecture, provider, database, authentication, evaluation, live-ingestion, and deployment guidance will continue to expand as each approved phase lands.

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

This runs lint, strict TypeScript checks, unit/component tests, a production build, and Playwright smoke tests. Production integrations are not required for the deterministic Phase 0 gate.

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
