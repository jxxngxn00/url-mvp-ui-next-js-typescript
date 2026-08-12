# MVP Scope

Last updated: 2026-08-07

## MVP Principle

The first version should prove the core experience:

> Patch note change text becomes useful hero-specific gameplay interpretation.

Implementation should stay small enough to finish, but the data model should not block later expansion.

## Included

### Data

- Hero master data
- Patch note metadata
- Patch note summaries
- Hero-level change analysis
- Affected tiers
- Synergy heroes
- Counter heroes
- Patch URL import records
- Parser staging rows for admin review
- Patch apply audit logs

### Screens

- Patch note list
- Patch note detail
- Hero detail analysis
- Meta timeline
- Search
- Admin hero DB management
- Admin patch note import/review/apply workspace

### Filters

- Role
- Hero
- Change type
- Impact level

### Analysis Fields

- Original change
- Simple summary
- Meta impact
- Affected tiers
- Recommended playstyle
- Counter picks
- Synergy picks

## Deferred

- Authentication
- Fully automated historical patch crawler
- User personalization
- Saved heroes
- Push notifications
- Win rate or pick rate integrations
- Multilingual UI beyond Korean-first content

## Suggested MVP Build Order

1. Write seed hero data.
2. Create Prisma schema.
3. Build mock patch analysis JSON.
4. Build patch list and patch detail UI from mock data.
5. Add database persistence.
6. Add LLM analysis endpoint.
7. Add hero detail page.
8. Add search and timeline.
9. Add Sentry and production hardening.

## Current Implementation Notes

- The MVP now includes a semi-automated admin patch update workflow.
- Parser output is staged in review tables before it is applied to public patch analysis tables.
- The current UI direction is the dark game portal design documented in `docs/UI_STRUCTURE.md`.
- The canonical DB model is `prisma/schema.prisma`; see `docs/DATA_MODEL.md` for the readable model guide.

