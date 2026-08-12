# Roadmap

## Phase 0: Planning

- Define product requirements.
- Define MVP scope.
- Define initial data model.
- Define screen and component structure.
- Initialize Git repository.

## Phase 1: Foundation

- Create Next.js project.
- Configure TypeScript.
- Add Joy UI.
- Add TanStack Query.
- Add Prisma and PostgreSQL.
- Add Sentry.

## Phase 2: Data Layer

- Implement Prisma schema.
- Seed hero master data.
- Create repositories for heroes, patch notes, and hero changes.
- Add mock patch analysis data.

## Phase 3: Core UI

- Build responsive app shell.
- Build patch note list.
- Build patch note detail.
- Build hero change cards.
- Add role, hero, change type, and impact filters.

## Phase 4: Analysis Flow

Status: Done

- Add patch note URL input.
- Fetch or paste patch note source content.
- Generate LLM analysis JSON.
- Validate generated JSON.
- Save analysis results to PostgreSQL.
- Stage parser results for admin review before applying to public tables.

## Phase 5: Expansion

- Build hero detail analysis page.
- Build meta timeline. See `docs/BACKLOG.md`.
- Build search.
- Improve prompt quality.
- Add error monitoring and production checks.

## Phase 6: Game Portal UI Refresh

Status: Done

- Reworked the user-facing UI around a dark game portal direction inspired by the current wireframe PDFs.
- Applied blue as the main color family, with cyan highlights and purple/pink accents.
- Updated desktop layout to feel like a command dashboard with a persistent sidebar.
- Updated mobile layout to preserve a compact single-column flow with fixed bottom navigation.
- Refined Patch Feed and admin import item selected states as card-like buttons with 8px radius.
- Kept React Query data flow, API routes, and existing feature logic unchanged.

## Open Questions

- Should fully automated historical crawling be added after the manual URL import workflow stabilizes?
- Should Korean or English patch notes be the primary source?
- Should tier analysis be generated entirely by LLM or constrained by fixed heuristics?
- Should hero images use official URLs or locally hosted assets?

