# Backlog

## Phase 7: Meta Timeline

Status: Todo

Phase 7 search work is partially covered by the current hero keyword filter. The remaining work is the meta timeline experience.

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

- This should be implemented after the Phase 9 stability pass so the timeline can reuse shared state UI and mobile polish patterns.
