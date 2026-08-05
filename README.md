# PatchSignal

PatchSignal is a Next.js MVP that turns official Overwatch patch notes into structured hero impact analysis.

The project focuses on a practical workflow for handling unstructured patch-note text: import the source, generate structured analysis with an LLM, review the parsed results in staging, and apply approved changes to the public analysis data.

## Why This Project Exists

Official patch notes describe what changed, but players still need to understand what those changes mean in real matches.

PatchSignal helps answer questions such as:

- Which heroes were meaningfully buffed or nerfed?
- Which ranks or playstyles are most affected?
- How does a patch shift the current meta?
- Which counters and synergies become more important?
- What should a player change after the patch?

## Core Features

- Patch note list and patch detail views
- Hero-level change cards with impact summaries
- Role, hero, change type, impact level, and keyword filters
- Hero detail pages with recent patch context
- Meta timeline built from analyzed patch data
- Official patch-note import API
- Gemini-based patch analysis endpoint
- Staging review workflow before applying generated analysis
- Admin routes for patch-note and hero data management
- Sentry setup for error monitoring
- Mobile-first responsive UI

## Architecture Highlights

PatchSignal is designed around a reviewable data pipeline instead of saving LLM output directly to production-facing tables.

```text
Official patch note URL
  -> import and normalize source content
  -> generate structured analysis with Gemini
  -> validate response with Zod schemas
  -> save parsed changes to staging tables
  -> review, approve, reject, or remap staged rows
  -> apply approved rows to public patch analysis tables
```

This flow keeps the LLM useful while still leaving room for human review, correction, and traceability.

## Tech Stack

- Next.js
- TypeScript
- React
- TanStack Query
- Joy UI
- Prisma
- PostgreSQL
- Supabase
- Gemini API
- Zod
- Vitest
- Sentry

## Quality Checks

Use the fast local check while editing:

```bash
pnpm check
```

Run the full deployment verification before shipping:

```bash
pnpm verify
```

`pnpm verify` regenerates the Prisma client, runs lint, typecheck, tests, and then creates a production build.

Current local verification:

- `pnpm.cmd check`: passed
- `pnpm.cmd build`: passed
- Test suite: 18 files, 92 tests passed

## Project Status

The MVP is in the stabilization phase.

Implemented areas include:

- Public patch analysis UI
- Hero detail analysis UI
- Meta timeline
- Patch-note import flow
- LLM parsing flow
- Staging review and apply workflow
- Admin APIs and admin screens
- Unit tests for core parsing, filtering, repository, service, and route logic

Next priorities:

- Deploy a public demo
- Add a short product walkthrough or demo video
- Strengthen admin authentication and authorization
- Improve visual polish for portfolio presentation
- Expand real patch-note examples

## Documentation

- [Product Requirements](./docs/PRD.md)
- [MVP Scope](./docs/MVP_SCOPE.md)
- [Data Model](./docs/DATA_MODEL.md)
- [UI Structure](./docs/UI_STRUCTURE.md)
- [Roadmap](./docs/ROADMAP.md)
- [Deployment Checklist](./docs/DEPLOYMENT_CHECKLIST.md)

## Environment Variables

Create a local `.env` file based on `.env.example`.

Required services include:

- PostgreSQL database connection
- Supabase project settings
- Gemini API key
- Sentry project settings

Do not commit local `.env` files or service credentials.
