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

- Add patch note URL input.
- Fetch or paste patch note source content.
- Generate LLM analysis JSON.
- Validate generated JSON.
- Save analysis results to PostgreSQL.

## Phase 5: Expansion

- Build hero detail analysis page.
- Build meta timeline.
- Build search.
- Improve prompt quality.
- Add error monitoring and production checks.

## Open Questions

- Should patch note ingestion start with URL crawling or manual paste?
- Should Korean or English patch notes be the primary source?
- Should tier analysis be generated entirely by LLM or constrained by fixed heuristics?
- Should hero images use official URLs or locally hosted assets?

