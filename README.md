# Overwatch Patch Insight

Overwatch Patch Insight is a toy project for analyzing Overwatch patch notes and turning hero changes into readable insight cards.

The MVP focuses on entering or collecting patch note URLs, extracting structured hero changes, and showing hero impact, meta interpretation, tier-specific notes, and recommended playstyle in a mobile-first responsive web UI.

## Project Status

MVP implementation is in the stabilization phase.

The app currently includes patch analysis data persistence, Gemini-based analysis, hero detail pages, meta timeline, Sentry setup, and shared loading, error, and empty states. The next focus is test coverage, refactoring, and deployment readiness.

## MVP Scope

- Patch note list
- Patch note detail
- Hero change cards
- Role and hero filters
- Hero detail analysis
- Meta timeline
- LLM analysis endpoint
- Sentry error monitoring
- Mobile-first responsive UI

## Stack

- Next.js
- TypeScript
- React
- TanStack Query
- Joy UI
- Prisma
- PostgreSQL
- Gemini API
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

`pnpm verify` regenerates the Prisma client, runs lint, typecheck, tests, and then creates a production build. When Sentry environment variables are configured, the production build also uploads release artifacts and source maps to Sentry.

## Documentation

- [Product Requirements](./docs/PRD.md)
- [MVP Scope](./docs/MVP_SCOPE.md)
- [Data Model](./docs/DATA_MODEL.md)
- [UI Structure](./docs/UI_STRUCTURE.md)
- [Roadmap](./docs/ROADMAP.md)
- [Deployment Checklist](./docs/DEPLOYMENT_CHECKLIST.md)

