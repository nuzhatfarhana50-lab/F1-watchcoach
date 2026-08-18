# AGENTS.md

## Build Execution Ledger

- **Current phase:** Phase 1 — Domain Contracts, Persistence Design, and Canonical Fixtures. The approved core and timing-evidence schema groups are live and verified; concept/explanation/media persistence is the next approval checkpoint.
- **Completed gates:** Phase 0 completed on 2026-08-17. Phase 1 core and timing-evidence gates completed on 2026-08-18 with normalized Zod contracts, temporal and evidence invariants, canonical British/Dutch fixtures, repository ports, an idempotent in-memory adapter and Prisma seed, reviewed Neon migrations, and deterministic plus live relational verification.
- **Active integrations:** Neon project `f1-watchcoach-development`, database `neondb`, main branch `br-divine-bonus-afev3o40`; Prisma 7.9.1. Migrations `20260817173000_phase1_core`, `20260818193000_phase1_timing_evidence_types`, and `20260818193100_phase1_timing_evidence` are applied and recorded in Prisma history. No other hosted service is connected. Never record the connection string in this repository.
- **Approved schema groups:** Phase 1 core approved on 2026-08-17. Timing evidence approved on 2026-08-18: `Lap`, `Position`, `PitStop`, `TyreStint`, `RaceControlEvent`, `Result`, and `ChampionshipStanding`, with source provenance and typed external references. Concept/explanation/media, pgvector, and user schema groups are not approved.
- **Key implementation decisions:** Next.js 16 App Router; React 19; Node.js runtime; npm; strict TypeScript; Tailwind CSS 4; Vitest; React Testing Library; Playwright 1.55.1; Zod at trust boundaries; normalized fixtures remain richer than the approved persistence groups only for learning content and media; Prisma uses its PostgreSQL driver adapter and generated client; canonical seed transactions have bounded Neon-aware limits (`maxWait` 30 seconds, `timeout` 120 seconds) without changing normal application transaction defaults; manual SQL checks enforce evidence ranges, standing targets, and exactly one typed external-reference target; PostgreSQL enum additions are committed in a separate migration before dependent constraints; Webpack production builds because Turbopack's CSS worker cannot bind its internal port in the managed macOS environment.
- **Last verified commands:** `npm run verify` passed on 2026-08-18 after the timing migration split (Prisma validation/generation, lint, strict typecheck, 17 deterministic unit/component/schema tests, production build, and 1 Chromium Playwright test). Repeated live seeds completed successfully. `npm run db:verify:canonical` passed against Neon with exact core and timing counts, zero invalid relations, memberships, timing links, duplicates, or orphaned provenance, and verified cascade/restrict policies. `npm audit --omit=dev` reports the known `deepmerge-ts@7.1.5` advisory through Prisma's CLI/config path; the offered fix is a breaking Prisma downgrade.
- **Next checkpoint:** Present the Phase 1 concept/explanation/media schema group, including affected records, constraints, generated SQL impact, and rollback approach, for explicit approval. pgvector and user persistence remain later separate approvals.
- **Documentation:** `README.md` documents local setup, the approved schema boundary, safe migration/seed commands, fixtures, and current verification limits; continue expanding it as later phases land.

Update this ledger after every completed phase and material architecture decision. Keep it concise; durable product and engineering rules below remain authoritative.

## Project Overview

- **Project:** F1 Watchcoach — a personalized Formula 1 learning application that teaches users through real race moments, media, race data, and connections to technical, strategic, historical, and human context.
- **Primary builder:** Codex.
- **Target user:** New and developing Formula 1 fans who want to understand what they are watching rather than memorize generic F1 facts.
- **Framework:** Next.js App Router.
- **Language:** TypeScript.
- **Backend:** Next.js Server Components, Server Actions, Route Handlers, and Vercel Functions.
- **Database:** Neon PostgreSQL.
- **Vector search:** pgvector.
- **ORM:** Prisma.
- **Authentication:** Clerk.
- **Deployment:** Vercel.
- **AI:** OpenAI API.
- **Race data:** OpenF1 + FastF1/Jolpica.
- **Video:** YouTube Data API using official/publicly embeddable sources.
- **Images:** Wikimedia Commons and appropriately licensed/public sources.
- **Object storage:** Vercel Blob.
- **Cache/live state:** Redis.
- **Background workflows:** Vercel Workflows.
- **Scheduled jobs:** Vercel Cron.
- **Testing:** Vitest, React Testing Library, and Playwright.
- **Validation:** Zod.
- **Package manager:** npm.
- **Design direction:** Dark, focused, polished, information-dense, and inspired by Linear's product design principles.

---

# Product Philosophy

F1 Watchcoach is **not a generic F1 chatbot**.

The application teaches Formula 1 by starting with real events the user has watched.

The fundamental product loop is:

```text
REAL RACE MOMENT
      ↓
WHAT HAPPENED?
      ↓
WHY DID IT HAPPEN?
      ↓
WHAT CONCEPT DOES IT TEACH?
      ↓
WHAT DOES IT CONNECT TO?
      ↓
WHAT SHOULD THE USER NOTICE NEXT TIME?
      ↓
SAVE WHAT THE USER LEARNED
```

Every significant product decision should reinforce this loop.

Do not default to:

- Generic chat experiences.
- Encyclopedia pages.
- AI-generated articles.
- Trivia-first experiences.
- Generic F1 Q&A.

The AI is a contextual teaching layer inside the product, not the product itself.

---

# Core MVP

The MVP should prioritize:

```text
Race Library
    ↓
Race
    ↓
Moment Cards
    ↓
Real Media / Race Data
    ↓
Moment Explanation
    ↓
Concept
    ↓
Related Moment / Connection
    ↓
Personal Learning Memory
```

Primary MVP capabilities:

- Browse races.
- Open a specific race.
- Discover important moments from that race.
- Associate moments with real race data.
- Associate moments with relevant videos/images where legally available.
- Explain what happened.
- Explain why it happened.
- Extract the F1 concept demonstrated by the moment.
- Connect that concept to another real F1 event.
- Save what the user has encountered and learned.
- Personalize future explanations using previous learning history.
- Support live race ingestion.

Do not significantly expand the MVP without explicit approval.

---

# Core Domain Concepts

The application should model at minimum:

- User.
- Driver.
- Team.
- Season.
- Grand Prix.
- Circuit.
- Session.
- Race.
- Race Moment.
- Lap.
- Position.
- Pit Stop.
- Tyre Stint.
- Race Control Event.
- Result.
- Championship Standing.
- Media.
- Concept.
- Explanation.
- Moment Connection.
- User Race History.
- User Learning State.
- User Interest.
- User Driver Preference.
- User Team Preference.
- Source.
- External Data Reference.

Prefer explicit domain objects over generic JSON blobs.

---

# Temporal Data Rules

Formula 1 relationships change over time.

Never model mutable historical relationships as timeless facts.

Bad:

```text
Driver → Team
```

Preferred:

```text
DriverTeamMembership

driverId
teamId
season
validFrom
validTo
```

Temporal modeling should be used where relevant for:

- Driver/team relationships.
- Team names.
- Constructor identities.
- Engine suppliers.
- Driver contracts.
- Team principals.
- Technical leadership.
- Regulations.
- Driver lineups.
- Car specifications.
- Championship standings.
- Team ownership.

Never overwrite historical truth simply because a relationship changed later.

---

# Race Moment Model

`RaceMoment` is one of the most important entities in the application.

A moment may represent:

- Overtake.
- Pit stop.
- Undercut.
- Overcut.
- Crash.
- Contact.
- Mechanical failure.
- Safety Car.
- Virtual Safety Car.
- Red flag.
- Penalty.
- Team order.
- Radio message.
- Strategy change.
- Tyre degradation.
- Lock-up.
- Qualifying lap.
- Race start.
- Restart.
- Championship-changing event.
- Technical issue.
- Driver mistake.
- Exceptional driver performance.

A moment should support relationships such as:

```text
RaceMoment
├── race
├── session
├── lap
├── timestamp
├── drivers[]
├── teams[]
├── raceData[]
├── media[]
├── concepts[]
├── explanations[]
├── relatedMoments[]
└── sources[]
```

Do not treat a moment as simply AI-generated text.

The structured event is the source of truth.

---

# Watch → Learn → Connect

Every important moment should support three layers.

## Watch

Show evidence first where useful.

Examples:

- Official video.
- YouTube embed.
- Image.
- Timing data.
- Telemetry.
- Position chart.
- Tyre information.
- Pit information.
- Race-control message.

## Learn

Explain:

1. What happened?
2. Why did it happen?
3. Why did it matter?
4. What F1 concept does it demonstrate?

## Connect

Connect the moment to:

- Another race.
- Historical moment.
- Strategy concept.
- Technical concept.
- Driver history.
- Team history.
- Similar incident.
- Championship consequence.

Connections must have a genuine explanatory reason.

Do not generate unrelated recommendations merely to increase engagement.

---

# AI Grounding Rules

Factual AI explanations must be grounded in retrieved application data and/or trusted external sources.

Do not rely on model memory when structured or retrieved information is available.

Preferred pipeline:

```text
User / Moment
      ↓
Retrieve structured race context
      ↓
Retrieve relevant concept/context
      ↓
Retrieve sources/media
      ↓
Construct grounded AI context
      ↓
Generate explanation
      ↓
Validate structured output
      ↓
Return to UI
```

AI should primarily perform:

- Explanation.
- Summarization.
- Teaching adaptation.
- Connection discovery.
- Concept classification.
- Contextualization.
- Personalization.

AI must not become the primary datastore.

---

# AI Output Principles

Explanations should be:

- Clear.
- Concise.
- Specific.
- Contextual.
- Grounded.
- Beginner-friendly by default.
- Technically accurate.
- Free from unnecessary jargon.

Prefer:

> Norris pitted because fresh tyres could give him enough pace to jump the car ahead when that driver eventually stopped. That's an undercut.

Avoid:

> An undercut is a strategic Formula 1 technique whereby a driver makes an earlier pit stop...

Start with what the user saw.

Introduce terminology afterward.

---

# Explanation Structure

When appropriate:

```text
What happened
→ Why
→ Why it matters
→ Concept
→ What to watch next time
```

Do not force every explanation into this format if a shorter answer works better.

---

# Personalization

Persist useful learning context.

User state may include:

- Watched races.
- Partially watched races.
- Favorite drivers.
- Favorite teams.
- Drivers followed.
- Teams followed.
- Concepts encountered.
- Concepts understood.
- Concepts needing reinforcement.
- Historical events encountered.
- Preferred explanation depth.
- Preferred learning style.
- Topics of interest.
- Previous moment interactions.

Personalization must improve future teaching.

Do not collect user information simply because it can be collected.

---

# Learning State

Suggested concept progression:

```text
unseen
↓
encountered
↓
learning
↓
understood
↓
reinforced
```

Do not treat mastery as a simple boolean if richer state provides meaningful personalization.

Avoid complex gamification unless explicitly requested.

---

# Concept System

Examples include:

## Strategy

- Undercut.
- Overcut.
- Pit window.
- Track position.
- One-stop.
- Two-stop.
- Tyre offset.
- Safety Car strategy.

## Tyres

- Degradation.
- Graining.
- Blistering.
- Warm-up.
- Compound.
- Thermal management.

## Racing

- Dirty air.
- Slipstream.
- Defensive driving.
- Racecraft.
- Overtaking.
- Qualifying.

## Engineering

- Downforce.
- Drag.
- Aero balance.
- Suspension.
- Brake balance.
- Energy deployment.
- Power-unit concepts.

## Regulations

- Penalties.
- Parc fermé.
- Race control.
- Safety Car.
- Flags.

Concept definitions should be connected to real examples wherever possible.

---

# F1 Data Providers

## OpenF1

Use OpenF1 for supported live/recent information such as:

- Timing.
- Positions.
- Laps.
- Stints.
- Pit stops.
- Race control.
- Relevant telemetry.

## FastF1 / Jolpica

Use where appropriate for:

- Historical results.
- Drivers.
- Constructors.
- Seasons.
- Race metadata.
- Timing.
- Telemetry where available.

Never assume every provider supports every season or field.

---

# Provider Architecture

External providers must sit behind internal adapters.

Preferred structure:

```text
src/
  lib/
    f1/
      providers/
        openf1/
        jolpica/
        fastf1/
      normalization/
      domain/
```

Application code should consume normalized internal domain objects.

Never spread vendor response shapes across the application.

Preferred flow:

```text
OpenF1 response
      ↓
OpenF1 adapter
      ↓
Normalized F1 domain model
      ↓
Application
```

Provider replacement should not require rewriting the UI or core domain logic.

---

# External Data Provenance

Preserve enough metadata to identify where factual data originated.

At minimum where relevant:

```text
source
externalId
sourceUrl
fetchedAt
sourceTimestamp
```

Full raw API response retention is not required by default.

Use external IDs and uniqueness constraints to prevent duplication.

---

# Live Race Ingestion

Live race ingestion is part of the product architecture.

Preferred flow:

```text
External F1 API
      ↓
Ingestion service
      ↓
Normalization
      ↓
Redis live state
      ↓
PostgreSQL persistent records
      ↓
Moment detection
      ↓
Context / AI layer
      ↓
Client
```

Rapidly changing race state should generally live in Redis before persistence.

Avoid unnecessary PostgreSQL writes for every live update.

Persist information that becomes historically meaningful.

---

# Backend Architecture

Use the **Next.js App Router** as the application backend.

Default primitives:

### React Server Components

Use for:

- Server-side data retrieval.
- Race pages.
- Historical data.
- User learning state.
- Database-backed views.

Prefer Server Components unless client interactivity is required.

### Server Actions

Use primarily for application mutations initiated from the Next.js UI.

Examples:

- Save favorite driver.
- Mark race watched.
- Update learning state.
- Save user preferences.

### Route Handlers

Use for HTTP interfaces.

Examples:

```text
/api/openf1/*
/api/webhooks/*
/api/ingestion/*
/api/live/*
```

Use Route Handlers when:

- External systems must call the application.
- HTTP semantics matter.
- Building ingestion endpoints.
- Receiving webhooks.
- Streaming data.
- Exposing internal APIs.

### Vercel Functions

Server-side Next.js execution deploys through Vercel Functions.

Do not create a separate Express, NestJS, Fastify, or other backend unless a demonstrated requirement justifies it.

The default is:

```text
Next.js App Router
+
Server Components
+
Server Actions
+
Route Handlers
+
Vercel Functions
```

---

# Authentication

Use **Clerk** as the default authentication provider.

Use Clerk for:

- Sign up.
- Sign in.
- Session management.
- User identity.
- Account management.

Do not scatter Clerk-specific identifiers through domain models.

Maintain an application-level `User`.

Preferred relationship:

```text
Clerk User
    ↓
externalAuthId
    ↓
F1 Watchcoach User
```

Domain entities should reference the internal user ID.

This allows authentication infrastructure to change later without rewriting core user data.

Never store authentication secrets yourself unless explicitly required.

---

# Background Processing

Use **Vercel Workflows** as the default durable background-processing system.

Suitable workloads include:

- Race ingestion.
- Historical synchronization.
- AI explanation generation.
- Embedding generation.
- Media enrichment.
- Moment detection.
- Race post-processing.
- Connection discovery.

Prefer workflows for processes that:

- Have multiple steps.
- Need retries.
- Can fail halfway through.
- Need durable execution.
- May take longer than a normal request.

Keep individual workflow steps small and idempotent where practical.

---

# Scheduled Processing

Use **Vercel Cron** for time-based triggers.

Examples:

```text
Cron
  ↓
Start ingestion workflow
  ↓
Fetch data
  ↓
Normalize
  ↓
Persist/cache
  ↓
Detect moments
```

Potential scheduled tasks:

- Upcoming race synchronization.
- Race-weekend ingestion.
- Historical data refresh.
- Media metadata refresh.
- Cleanup tasks.

Cron should trigger work.

Do not put large processing pipelines directly inside the scheduler endpoint when a durable workflow is more appropriate.

---

# Vercel Queues

Do not introduce Vercel Queues by default.

Add queues when the application develops a clear event-streaming or high-volume fan-out requirement.

Examples:

```text
Race event
   ↓
Queue
   ├── moment detection
   ├── analytics
   ├── persistence
   └── notifications
```

For the MVP, prefer Workflows unless queue semantics are specifically needed.

---

# Redis

Redis is used for ephemeral and frequently changing state.

Use Redis for:

- Live race state.
- Frequently accessed race context.
- API response caching.
- Expensive computed results.
- Rate limiting.
- Temporary workflow state where appropriate.
- Short-lived AI context caches.

Redis is not the permanent source of truth.

---

# PostgreSQL

Neon PostgreSQL is the primary system of record.

Use PostgreSQL for:

- Domain entities.
- Race metadata.
- Historical records.
- Users.
- Learning state.
- Relationships.
- Moment metadata.
- Media metadata.
- Sources.
- AI generation metadata.
- Embeddings through pgvector.

Prefer relational modeling for structured F1 data.

Do not push strongly structured data into vector storage.

---

# pgvector

Use pgvector for semantic retrieval.

Possible embedding targets:

- Moment descriptions.
- Concepts.
- Historical context.
- Explanations.
- Permitted source excerpts.
- Related race moments.

Semantic similarity is not factual proof.

Combine embeddings with structured filtering where useful:

```text
semantic similarity
+
season
+
driver
+
race
+
concept
```

Prefer deterministic SQL retrieval when possible.

Do not introduce a dedicated vector database without explicit approval.

---

# Prisma

Prisma is the primary ORM.

Follow existing Prisma patterns.

Database schema changes require explicit user confirmation.

Before a schema change:

1. Explain the proposed change.
2. Explain why it is required.
3. Explain which models are affected.
4. Get confirmation.
5. Create the migration.
6. Review generated SQL where appropriate.
7. Apply only to the intended environment.

Never reset, drop, truncate, or destructively modify a database without explicit permission.

---

# Media

Media is a core part of the learning experience.

Supported media may include:

- Video embeds.
- Images.
- Onboard videos.
- Radio clips.
- Interviews.
- Highlights.
- Diagrams.
- Charts.
- Timing visualizations.

Suggested metadata:

```text
Media
├── provider
├── providerId
├── type
├── title
├── url
├── embedUrl
├── thumbnailUrl
├── startTimestamp
├── endTimestamp
├── season
├── race
├── session
├── lap
├── drivers[]
├── teams[]
├── concepts[]
├── license
└── attribution
```

Do not create fields that cannot be reliably populated merely to conform to this structure.

---

# Media Rights

This rule is strict.

Do not:

- Download copyrighted F1 footage without appropriate rights.
- Rehost copyrighted F1 footage.
- Circumvent video-platform restrictions.
- Remove attribution.
- Upload protected race footage to Vercel Blob for convenience.
- Scrape services to bypass official restrictions.

Prefer:

- Official embeds.
- Public links.
- Official Formula 1 content.
- FIA material where permitted.
- Team content.
- Driver content.
- YouTube embeds.
- Wikimedia Commons.
- Properly licensed imagery.
- Application-generated assets.

Store references and metadata rather than copyrighted media binaries unless explicit rights exist.

---

# YouTube

Use the YouTube Data API for video discovery and metadata.

Prefer official channels.

Useful metadata includes:

```text
videoId
channelId
channelName
title
thumbnail
publishedAt
relevantTimestamp
```

The application should support connecting a Race Moment to the relevant timestamp inside a video.

Do not assume YouTube search ranking means factual relevance.

---

# Vercel Blob

Use Vercel Blob for application-owned assets such as:

- Generated diagrams.
- Generated images.
- User-owned uploads where supported.
- Application-generated artifacts.

Do not use Blob to bypass third-party media restrictions.

---

# Search & Retrieval

Retrieval may combine:

```text
Structured PostgreSQL lookup
+
pgvector semantic retrieval
+
external provider lookup
+
user learning state
```

Prefer deterministic structured retrieval before semantic retrieval.

For exact entities such as:

- Driver.
- Team.
- Race.
- Season.
- Circuit.
- Lap.

use structured queries first.

---

# Source Reliability

When sources disagree:

- Prefer primary sources.
- Prefer structured official data where appropriate.
- Do not silently select whichever value is easiest.
- Do not present uncertain information as established fact.
- Preserve source attribution.

Rumor-focused functionality is outside MVP scope.

---

# OpenAI API

Use the OpenAI API for AI functionality.

Model calls should be centralized.

Suggested structure:

```text
src/
  lib/
    ai/
      generateExplanation.ts
      generateConnections.ts
      classifyConcept.ts
      retrieveContext.ts
```

Do not scatter direct OpenAI calls throughout UI components.

Keep model names configurable.

---

# Structured AI Outputs

Prefer structured outputs when results are consumed programmatically.

Example:

```ts
{
  summary: string;
  whyItHappened: string;
  whyItMatters: string;
  concepts: ConceptReference[];
  relatedMomentIds: string[];
}
```

Validate generated output before persistence.

Never trust AI-generated database IDs.

Resolve entity references against real database records.

---

# AI Cost Controls

AI costs must be considered during implementation.

Prefer:

- Caching repeated generations.
- Reusing stable explanations.
- Small focused prompts.
- Retrieving only relevant context.
- SQL before LLM calls.
- Pre-generating stable race explanations where useful.
- Avoiding duplicate embeddings.
- Avoiding LLM calls caused by rerenders.
- Batch processing when appropriate.

Do not use an LLM for deterministic work.

---

# AI Generation Persistence

When important AI-generated content is persisted, consider storing:

```text
generationId
model
createdAt
contextReference
promptVersion
output
```

The purpose is:

- Debugging.
- Reproducibility.
- Cost analysis.
- Quality analysis.

Do not store unnecessary sensitive context.

---

# TypeScript Standards

Use **strict TypeScript**.

Do not use `any` by default.

Prefer:

- Explicit domain types.
- Inferred local types where obvious.
- `unknown` for untrusted input.
- Narrowing before usage.
- Discriminated unions where appropriate.

`any` may only be used when:

- A third-party library genuinely requires it.
- A practical alternative would create disproportionate complexity.

Add a comment explaining non-obvious `any` usage.

---

# Runtime Validation

Use **Zod** at trust boundaries.

Validate data from:

- Client input.
- URL parameters.
- Form submissions.
- External APIs where needed.
- Webhooks.
- AI structured outputs.
- Environment variables where practical.

Do not duplicate validation unnecessarily inside trusted internal layers.

TypeScript types do not replace runtime validation for untrusted external data.

---

# React / Next.js Conventions

Prefer Server Components.

Add `"use client"` only when required for:

- Browser APIs.
- Local interactive state.
- Client event handling.
- Client-specific libraries.

Do not make an entire route client-side because one child component requires interactivity.

Prefer:

```text
Server Page
   ↓
Server Components
   ↓
Small Client Islands
```

Keep client bundles small.

---

# Design Principles

Follow principles associated with products such as Linear:

- Focused.
- Fast.
- Dark-first.
- Minimal visual noise.
- Strong hierarchy.
- Strong typography.
- Compact but readable.
- Purposeful motion.
- High perceived performance.
- Consistent interaction patterns.
- Progressive disclosure.

Avoid:

- Generic chatbot aesthetics.
- Giant AI gradients.
- Excessive glowing effects.
- Dashboard clutter.
- Unnecessary cards.
- Excessive rounded containers.
- Decorative animations.
- Landing-page aesthetics inside core workflows.

The interface should feel like a serious F1 companion rather than an AI demonstration.

---

# Core UI Principle

The primary interface object is a **Race Moment**, not a chat message.

A moment should make it easy to understand:

```text
WHAT HAPPENED
WHY IT MATTERS
MEDIA / DATA
CONCEPT
CONNECTION
```

Conversational AI may exist inside the context of a race or moment.

Do not use a blank chat interface as the default homepage.

---

# Performance

Treat perceived speed as a product feature.

Prefer:

- Server-side retrieval.
- Parallel independent requests.
- Redis caching.
- Streaming where beneficial.
- Lazy-loaded media.
- Optimized images.
- Pagination.
- Server Components.
- Minimal hydration.
- Request deduplication.

Do not optimize prematurely without evidence.

---

# Observability

Observability is required from the beginning.

Start with **Vercel Observability and application-level structured logging**.

Critical flows should expose enough information to diagnose failures.

Track:

- OpenF1 failures.
- Jolpica/FastF1 failures.
- Ingestion failures.
- OpenAI failures.
- YouTube failures.
- Database errors.
- Redis errors.
- Workflow failures.
- AI validation failures.
- Significant latency problems.

Never log:

- API keys.
- Tokens.
- Credentials.
- Private authentication data.
- Sensitive user information.

Do not use scattered `console.log` calls as the long-term production logging strategy.

---

# Error Handling

Errors must be explicit.

Do not:

- Swallow exceptions.
- Pretend failed external requests returned valid empty data.
- Hide ingestion failures.
- Expose raw server errors directly to users.

Preferred flow:

```text
Failure
→ capture diagnostic context
→ log
→ return typed application error
→ show appropriate UI state
```

Where useful, distinguish:

- Loading.
- Empty.
- Unavailable.
- External provider failure.
- Application failure.

---

# Environment Variables

All secrets and environment-specific configuration must use environment variables.

Maintain:

```text
.env.example
```

Possible variables include:

```text
DATABASE_URL
OPENAI_API_KEY
YOUTUBE_API_KEY
REDIS_URL
BLOB_READ_WRITE_TOKEN

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
```

Only add variables actually used.

Never commit:

- API keys.
- Database passwords.
- Private tokens.
- Production secrets.

Document new required variables.

---

# Dependencies

New dependencies are allowed when justified.

Before adding one:

1. Check whether the current stack already solves the problem.
2. Prefer maintained packages.
3. Avoid overlapping libraries.
4. Avoid large packages for trivial functionality.
5. Check compatibility with the existing project.
6. Explain unusual dependencies in the final summary.

Do not replace existing libraries casually.

---

# Architecture Boundaries

Maintain clear boundaries:

```text
UI
↓
Application / Features
↓
Domain
↓
Repositories / Services
↓
Provider Adapters
↓
External Systems
```

React components should not understand OpenF1, YouTube, OpenAI, or Jolpica response formats.

External-provider knowledge belongs in adapters.

---

# Authentication Boundary

Clerk handles identity.

F1 Watchcoach owns domain-level user information.

Do not use Clerk metadata as the main database for:

- Learning history.
- Favorite drivers.
- Watched races.
- Concepts.
- User personalization.

Keep these in PostgreSQL.

---

# Testing

Testing is required.

Primary tools:

- Vitest.
- React Testing Library.
- Playwright.

After meaningful changes:

- Run relevant tests.
- Run lint.
- Run build when practical.
- Verify affected flows.

New meaningful features should include an appropriate test.

Use unit tests for:

- Domain logic.
- Normalization.
- Utilities.
- AI-output validation.
- Moment detection logic.

Use integration tests for:

- API boundaries.
- Database operations.
- Provider adapters.
- Authentication boundaries.

Use Playwright for:

- Race browsing.
- Moment interactions.
- Learning flows.
- Authentication-critical paths.
- Important user journeys.

Never disable or delete tests merely to make CI pass.

---

# Testing External APIs

Unit tests must not normally depend on live third-party APIs.

Mock or fixture:

- OpenF1.
- Jolpica.
- FastF1.
- YouTube.
- OpenAI.
- Redis.

Maintain explicit integration tests separately when live verification is useful.

Tests should be deterministic.

---

# Commands

Inspect `package.json` before running commands.

Expected conventional commands:

```bash
npm install
npm run dev
npm run build
npm test
npm run lint
```

Do not invent scripts that do not exist.

If a needed script is missing, explain the issue.

---

# Development Workflow

Before modifying code:

1. Read relevant existing files.
2. Understand current patterns.
3. Identify the smallest reasonable change.
4. Check whether schema, architecture, dependencies, or external contracts are affected.
5. Ask for approval where required.
6. Implement.
7. Test.
8. Review the diff.
9. Summarize changes.

Do not begin broad rewrites before understanding the existing implementation.

---

# Do

- Read existing code before modifying anything.
- Match existing architecture and naming.
- Keep changes focused.
- Handle errors explicitly.
- Prefer simple solutions.
- Reuse existing utilities.
- Preserve historical accuracy.
- Ground factual AI outputs.
- Preserve source provenance.
- Respect media rights.
- Preserve temporal relationships.
- Consider API costs.
- Consider AI costs.
- Cache appropriately.
- Add tests for meaningful behavior.
- Run relevant verification.
- Update documentation when architecture changes.
- Use Server Components by default.
- Validate untrusted input.
- Keep TypeScript strict.
- Make reversible low-risk assumptions when appropriate.
- Tell the user what assumptions were made.

---

# Don't

- Hardcode secrets.
- Rehost copyrighted F1 footage.
- Treat model memory as authoritative F1 data.
- Build a chatbot-first interface.
- Add unnecessary dependencies.
- Replace working architecture without need.
- Modify the database schema without confirmation.
- Delete files unnecessarily.
- Delete tests to get a build passing.
- Rewrite working code merely for style preference.
- Force push.
- Push without permission.
- Deploy without permission.
- Perform destructive database operations without permission.
- Modify unrelated areas.
- Introduce speculative abstractions.
- Add infrastructure without a demonstrated need.
- Use `any` casually.
- Move server logic into the browser unnecessarily.

---

# Database Schema Changes

Schema modifications require explicit user confirmation.

This includes:

- New models.
- Removing models.
- Renaming persisted fields.
- Relationship changes.
- Required persisted fields.
- Destructive constraints.
- Data-transforming migrations.

Before changing schema:

```text
Proposed change
→ Reason
→ Models affected
→ Migration impact
→ User confirmation
→ Implementation
```

Never run destructive Prisma commands without permission.

---

# Git

Codex may create small, focused **local commits** after completing and verifying coherent changes.

Commit examples:

```text
feat: add race moment concept relationships
```

```text
fix: prevent duplicate OpenF1 pit stop records
```

Never:

- Force push.
- Rewrite shared history.
- Push without permission.
- Merge without permission.
- Deploy automatically.

Keep unrelated changes out of the same commit.

---

# Documentation

Update documentation when changes affect:

- Architecture.
- Setup.
- Environment variables.
- External APIs.
- Database behavior.
- Developer workflows.
- Major feature behavior.

Do not generate unnecessary documentation for trivial internal changes.

---

# Decision Making

When requirements are ambiguous:

## Low-risk and reversible

Make the safest reasonable assumption and mention it afterward.

Examples:

- Variable names.
- Small component organization.
- Internal helper placement.
- Test fixture structure.

## Product, architecture, infrastructure, schema, or destructive ambiguity

Ask before proceeding.

Examples:

- Database schema changes.
- Adding a major service.
- Replacing Clerk.
- Replacing Prisma.
- Changing learning models.
- Removing features.
- Destructive data operations.
- Major architecture rewrites.

Do not guess when the decision is expensive to reverse.

---

# When Stuck

If a task is large:

1. Break it into steps.
2. Explain the plan briefly.
3. Confirm material architecture decisions where required.
4. Implement incrementally.

If the same error cannot be resolved after **two serious attempts**:

1. Stop modifying code.
2. Explain the error.
3. Show the relevant failure.
4. Summarize both attempted fixes.
5. State the most likely root cause.
6. Recommend the next investigation.

Do not randomly modify unrelated code hoping the error disappears.

---

# Change Scope

Prefer the smallest change that solves the requested problem.

A request such as:

> Add related moments to the Moment page.

should not automatically result in:

- Rewriting page architecture.
- Changing authentication.
- Replacing Prisma.
- Redesigning unrelated database models.
- Adding global state management.
- Rebuilding navigation.

Mention useful adjacent improvements separately.

Do not silently expand scope.

---

# Security

Treat external input as untrusted.

Validate:

- API input.
- Route parameters.
- Search parameters.
- External-provider responses.
- AI output.
- Webhook payloads.
- User content.
- Upload metadata.

Never expose secrets to client components.

Never place private credentials in:

- Browser bundles.
- Logs.
- Error messages.
- AI prompts unless strictly required.

---

# Rate Limits

External services may impose rate limits.

Integrations should support:

- Caching.
- Retry handling.
- Exponential backoff where appropriate.
- Provider errors.
- Quota exhaustion.
- Request deduplication.

Do not aggressively retry failed requests.

Avoid duplicate requests caused by rendering behavior.

---

# Data Freshness

Different F1 data requires different freshness.

```text
Historical race result → effectively immutable

Current championship → frequently refreshed

Live timing → rapidly changing

User learning state → persist immediately

Media metadata → periodically refreshable
```

Do not apply one caching policy to every data type.

---

# Historical Integrity

Historical information must remain historically accurate.

Do not rewrite previous seasons using current:

- Team names.
- Driver teams.
- Engine suppliers.
- Regulations.
- Personnel.

A historical race should display information appropriate to that point in time.

---

# Moment Connections

Connections between moments should have identifiable reasons.

Examples:

```text
sameConcept
sameDriver
sameCircuit
similarStrategy
historicalParallel
championshipContext
technicalParallel
teamHistory
```

Prefer storing explicit connection metadata over unexplained AI-generated relationships.

---

# Personal Learning Memory

Personalization should answer:

> What does this user already know, and what context will help them understand this moment?

Example:

```text
Previously learned:
Undercut

Current moment:
Driver pits early

Coach:
"Remember the undercut from the previous race?
This is the same basic idea, but here tyre
warm-up changes the calculation."
```

This continuity is a core product capability.

---

# Non-Goals for MVP

Unless explicitly requested, do not prioritize:

- Generic F1 chatbot.
- Social network.
- Fantasy F1.
- Betting.
- Merchandise.
- Large-scale gamification.
- Rumor aggregation.
- Full F1 encyclopedia.
- Public user-generated content.
- Native mobile applications.
- Complex admin dashboards.
- Custom video hosting.
- Dedicated vector database.
- Multi-provider AI routing.
- Microservices.

---

# Definition of Done

A feature is not complete merely because the UI renders.

Where applicable, completion means:

```text
implementation
+
error handling
+
loading/empty states
+
tests
+
grounded data
+
appropriate caching
+
documentation if needed
+
successful lint/test/build
```

Before considering work complete:

- Review the diff.
- Check for unrelated modifications.
- Check for accidental secrets.
- Check for unnecessary dependencies.
- Check factual data paths.
- Check media-rights implications.
- Run relevant verification commands.

---

# Response Style

When communicating with the user:

- Be clear.
- Be concise.
- Use plain English.
- Avoid unnecessary jargon.
- Avoid long sentences.
- Avoid long paragraphs.
- State what changed.
- State what was verified.
- State important assumptions.
- Surface blockers directly.

Do not overwhelm the user with implementation details unless they affect a decision.

---

# Final Principle

When choosing between:

> "This makes the AI look impressive."

and:

> "This helps the user understand the race they just watched."

choose the second.

F1 Watchcoach exists to turn **real Formula 1 moments into lasting understanding**.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
