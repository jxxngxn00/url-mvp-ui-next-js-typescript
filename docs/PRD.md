# Product Requirements Document

## 1. Overview

PatchSignal is a responsive web service that analyzes Overwatch patch notes and presents the expected gameplay impact by hero.

Users enter or select a patch note URL. The service extracts hero-level changes and generates structured analysis cards containing impact level, meta influence, affected competitive tiers, recommended playstyle, counters, and synergies.

## 2. Problem

Official patch notes explain what changed, but they do not always explain how the change affects actual gameplay.

Players often need to answer questions like:

- Was this hero meaningfully buffed or only slightly adjusted?
- Which ranks are most affected?
- Does this change alter the meta?
- How should I play this hero after the patch?
- Which heroes work better or worse with this changed hero?

## 3. Target Users

- Overwatch players who want fast patch interpretation
- Competitive players tracking hero balance
- Content creators preparing patch summaries
- Casual players who want simple hero-specific explanations

## 4. MVP Goal

Build a mobile-first web app that can display structured patch analysis from patch note data.

The first MVP does not need perfect automation. It may start with manually inserted or semi-automatically analyzed patch data, as long as the UI and data model support the full analysis flow.

## 5. Core User Flow

1. User opens the patch note list.
2. User selects a patch note.
3. User sees an overall patch summary and meta summary.
4. User filters changes by role, hero, change type, or impact level.
5. User opens a hero change card or hero detail page.
6. User reads tier-specific interpretation, recommended playstyle, counters, and synergies.

## 6. Key Features

### Patch Note List

- Show available analyzed patch notes.
- Sort by patch date, newest first.
- Show patch title, date, source URL, and short summary.

### Patch Note Detail

- Show overall summary.
- Show meta summary.
- Show hero change cards.
- Support role and hero filters.
- Support change type and impact level filters.

### Hero Change Card

- Hero identity: Korean name, English name, role, image.
- Change type: buff, nerf, adjustment, bug fix.
- Impact level: low, medium, high.
- Original patch text.
- Simple summary.
- Meta impact.
- Affected tiers.
- Recommended playstyle.
- Counter picks.
- Synergy picks.

### Hero Detail Analysis

- Show hero profile.
- Show recent patch history.
- Show repeated buff/nerf trend.
- Show common counters and synergies from analyzed patches.

### Meta Timeline

- Show patch-by-patch meta summary.
- Highlight high-impact hero changes.

### Search

- Search patch notes, heroes, and hero changes.

## 7. Non-Goals For MVP

- User accounts
- Public comments
- Real-time stats integration
- Automatic crawling of every historical patch note
- Perfect esports-level meta prediction
- Native mobile app

## 8. Success Criteria

- A user can understand the main impact of a patch within one minute.
- A user can filter changes down to their role or hero.
- A user can open a hero and understand how to adjust their playstyle.
- The app works comfortably on mobile and scales to desktop layouts.

