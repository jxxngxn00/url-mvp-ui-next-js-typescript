# MVP Scope

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

### Screens

- Patch note list
- Patch note detail
- Hero detail analysis
- Meta timeline
- Search

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
- Admin dashboard
- Full patch crawler
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

