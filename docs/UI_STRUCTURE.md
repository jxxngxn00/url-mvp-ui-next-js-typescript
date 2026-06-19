# UI Structure

## Design Direction

- Mobile-first responsive web.
- One Next.js app, not separate mobile and web apps.
- Mobile uses bottom navigation and compact filter controls.
- Desktop expands to a sidebar and wider content layout around 1440px.
- UI should prioritize scanning, filtering, and reading hero cards.

## Global Layout

### Mobile

```txt
MobileHeader
MainContent
BottomNavigation
```

### Desktop

```txt
AppShell
  DesktopSidebar
  MainContent
```

## Screens

### 1. Patch Note List

Mobile:

```txt
MobileHeader
RoleFilterTabs
PatchNoteList
  PatchNoteListItem
BottomNavigation
```

Desktop:

```txt
DesktopSidebar
MainContent
  PageHeader
  FilterToolbar
  PatchNoteList
    PatchNoteListItem
```

### 2. Patch Note Detail

Mobile:

```txt
PatchSummaryHeader
PatchMetaSummary
RoleFilterTabs
HeroFilterSheet
HeroChangeCardList
  HeroChangeCard
```

Desktop:

```txt
PatchSummaryHeader
TwoColumnLayout
  MainColumn
    PatchMetaSummary
    FilterToolbar
    HeroChangeCardList
  SideColumn
    ImpactOverview
    AffectedTierSummary
    TopChangedHeroes
```

### 3. Hero Detail Analysis

```txt
HeroDetailHeader
HeroImpactSummary
HeroChangeHistory
  HeroChangeCardList
HeroMatchupList
  SynergyPicks
  CounterPicks
```

### 4. Meta Timeline

```txt
MetaTimeline
  MetaTimelineItem
    PatchDate
    PatchTitle
    MetaSummary
    TopBuffedHeroes
    TopNerfedHeroes
    HighImpactChanges
```

### 5. Search

```txt
SearchInput
SearchFilterTabs
SearchResultList
  PatchResultItem
  HeroResultItem
  HeroChangeResultItem
```

## Shared Components

```txt
components/
  layout/
    AppShell
    MobileHeader
    BottomNavigation
    DesktopSidebar

  patches/
    PatchNoteList
    PatchNoteListItem
    PatchSummaryHeader
    PatchMetaSummary

  heroes/
    HeroAvatar
    HeroChangeCard
    HeroChangeCardList
    HeroDetailHeader
    HeroImpactSummary
    HeroMatchupList

  filters/
    RoleFilterTabs
    HeroFilterSheet
    ChangeTypeFilter
    ImpactLevelFilter

  timeline/
    MetaTimeline
    MetaTimelineItem

  search/
    SearchInput
    SearchResultList

  common/
    EmptyState
    LoadingState
    ErrorState
    ResponsiveContainer
```

## Visual Encoding

Change type:

- BUFF: green
- NERF: red
- ADJUSTMENT: blue
- BUG_FIX: neutral

Impact level:

- LOW: neutral
- MEDIUM: warning
- HIGH: danger

