# Backlog

## Phase 7: Meta Timeline

Status: Done

Phase 7 search work is partially covered by the current hero keyword filter. The meta timeline experience was implemented as part of the Phase 9 stability pass so it can reuse shared state UI and mobile polish patterns.

### Scope

- Show meta impact changes across patch notes.
- Let users scan trends by hero, role, change type, and impact level.
- Reuse existing patch analysis data instead of adding a separate data source.
- Link timeline items back to patch detail and hero detail pages.

### Acceptance Criteria

- Users can see a chronological list or timeline of patch-driven meta changes.
- Users can filter timeline entries by role, hero, change type, and impact level.
- Empty, loading, and error states match the shared app states.
- Mobile layout remains readable without horizontal overflow.

### Notes

- Implemented with existing patch analysis data and `/api/meta-timeline`.
- Visual treatment has since been refreshed to match the dark game portal UI direction in `docs/UI_STRUCTURE.md`.
- Future improvements can revisit timeline visualization depth without changing the current API contract.

## Phase 8: Game Portal UI Refresh

Status: Done

### Scope

- Apply the Game Global-inspired visual direction from the wireframe PDFs to the app shell.
- Use dark panels, blue/cyan primary states, and purple/pink accent surfaces.
- Preserve responsive behavior for desktop and mobile.
- Keep all existing data fetching, filtering, and mutation logic intact.

### Acceptance Criteria

- User-facing screens use the dark game portal visual system.
- Patch Feed selected state is visually distinct from default and hover states.
- Mobile layout keeps a fixed bottom nav and has no horizontal overflow.
- Admin screens remain usable and readable with the shared dark token system.
- Typecheck, lint, and production build pass.
