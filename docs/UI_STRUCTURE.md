# UI Structure

## Design Direction

- Mobile-first responsive web with a dark game portal visual language.
- The user-facing app uses a Game Global-inspired treatment: dark panels, neon blue/purple accents, compact game-card grids, and clear selected states.
- The main color family is blue, with cyan for active/highlight states and purple/pink for accent bands and high-emphasis UI.
- Admin screens share the same dark token system, but stay calmer and more task-focused than the user-facing dashboard.
- Existing data flow remains unchanged: React Query fetches patch, hero, timeline, and admin data; UI changes should not alter API contracts.

## Visual System

### Color Tokens

```txt
Background: #111216 / #0d0f15
Surface:    #171a21
Panel:      #20242d / #2a303b
Line:       #3a4352
Text:       #f2f6ff
Muted:      #9aa7b9
Primary:    #1e88ff
Highlight:  #36d7ff
Accent:     #a728ff
Danger:     #ff2fb3
Success:    #6dff8c
Warning:    #ff8a35
```

### Shape And Interaction

- Cards and content panels use 8px radius.
- Global command buttons use pill radius unless they are card-like list items.
- Patch Feed and admin import list items are button elements styled as 8px cards.
- Selected list items use:
  - cyan border
  - blue/purple gradient background
  - left neon rail indicator
  - small green status dot
- Hover states should stay within the dark game palette and avoid default light MUI hover colors.

## Global Layout

### Mobile

```txt
MobileHeader
MainContent
  FeaturedPatchBriefing
  PatchFeed
  MetaIntel
  TacticalFilterToolbar
  GlobalMetaTrack
  HeroIntelCardList
BottomNavigation
```

- Mobile keeps content in a single column.
- Bottom navigation is fixed, rounded, translucent, and optimized for thumb reach.
- Filter groups can scroll horizontally where needed.
- No horizontal overflow is allowed at 390px width.

### Desktop

```txt
GamePortalShell
  DesktopSidebar
  MainContent
    FeaturedPatchBriefing
    PatchFeed
    MetaIntel
    TacticalFilterToolbar
    GlobalMetaTrack
    HeroIntelCardList
```

- Desktop uses a persistent left sidebar at 1120px and above.
- Main content expands to a wider command-dashboard canvas.
- Decorative character-like silhouettes can sit behind content, but they must not block reading or interaction.
- The toolbar can become sticky for fast scanning and filtering.

## Screens

### 1. Patch Analysis Dashboard

Current implementation route:

```txt
/
```

Desktop structure:

```txt
DesktopSidebar
MainContent
  Patch Feed
    PatchFeedItemButton
  Latest Briefing
    PatchTitle
    PatchSummary
    SourcePatchNoteCTA
    StatCards
  Meta Intel
  TacticalFilterToolbar
    RoleSegmentedControl
    ChangeTypeSegmentedControl
    ImpactSegmentedControl
    HeroSearchInput
  Global Meta Track
    TimelinePatch
    TimelineEntry
  HeroIntelCardList
    HeroIntelCard
```

Mobile structure:

```txt
MobileHeader
Latest Briefing
Patch Feed
Meta Intel
TacticalFilterToolbar
Global Meta Track
HeroIntelCardList
BottomNavigation
```

### 2. Hero Detail

Current implementation route:

```txt
/heroes/[heroId]
```

Structure:

```txt
DesktopSidebar / MobileHeader
HeroProfileCommand
  HeroAvatar
  HeroName
  HeroRole
  BackToPatchListCTA
  HeroStatCards
HeroMatchupPanels
  SynergyPicks
  CounterPicks
HeroChangeHistory
  HeroDetailChangeCard
BottomNavigation on mobile
```

### 3. Admin Hero DB

Current implementation route:

```txt
/admin/heroes
```

Structure:

```txt
AdminHeader
HeroDbCommandPanel
  RoleFilter
  KeywordSearch
HeroAdminGrid
  HeroAdminEditCard
```

- Uses the dark token system.
- Keeps a restrained workbench feel instead of the more expressive user dashboard.

### 4. Admin Patch Notes

Current implementation route:

```txt
/admin/patch-notes
```

Structure:

```txt
AdminHeader
PatchImportPanel
  SourceUrlInput
  ImportCTA
AdminReviewLayout
  ImportListPanel
    AdminImportItemButton
  ReviewWorkspace
    ParseCTA
    ApplyCTA
    StagingReviewCardList
```

- Import list selection mirrors Patch Feed selection with 8px card radius and active-state rail.
- Review cards prioritize form density and readable validation states.

## Shared Components

Current shared component ownership:

```txt
src/features/patch-analysis/components.tsx
  Brand
  SideNavigation
  BottomNavigation
  StateCard
  InlineStateCard
  PatchListPanel
  PatchSummaryPanel
  MetaSummaryPanel
  PatchFilters
  MetaTimelinePanel
  HeroChangeList

src/features/heroes/components.tsx
  HeroDetailView
  HeroHeader
  HeroRelationPanel
  HeroChangeHistory
```

Main style ownership:

```txt
src/app/page.module.css
src/app/providers.tsx
src/app/globals.css
```

## Visual Encoding

Change type:

- BUFF: success/cyan-green treatment
- NERF: danger/pink treatment
- ADJUSTMENT: primary/blue-purple treatment
- BUG_FIX: neutral treatment

Impact level:

- LOW: neutral
- MEDIUM: warning/orange
- HIGH: danger/pink or high-emphasis chip

## Verification Expectations

- `pnpm typecheck` passes.
- `pnpm lint` passes.
- `pnpm build` passes.
- Desktop 1280px viewport has no layout collapse.
- Mobile 390px viewport has no horizontal overflow.
- Loading, empty, and error states remain readable in the dark theme.
