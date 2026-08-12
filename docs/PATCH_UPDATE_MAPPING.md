# Patch Update Parser and Mapping

Last updated: 2026-08-07

Source of truth: `prisma/schema.prisma`, `src/features/patch-update/*`, and API routes under `src/app/api/admin/patch-notes`.

## Current Strategy

The manual URL based update system does not write parser output directly to the public patch tables. It creates reviewable staging rows first, then applies only approved rows to the existing final tables.

```txt
Admin URL input
-> fetch official patch note HTML
-> extract title/date/body text
-> save patch_imports
-> parse raw_text into PatchAnalysis JSON
-> convert PatchAnalysis changes into patch_change_staging
-> admin review/edit/map/approve/reject
-> apply approved staging rows to final public tables
```

## Implemented API Surface

| Endpoint | Purpose |
| --- | --- |
| `GET /api/admin/patch-notes` | List recent patch imports with staging counts |
| `POST /api/admin/patch-notes/import` | Import URL content and optionally parse immediately |
| `GET /api/admin/patch-notes/:importId` | Read an import with staging rows and relations |
| `POST /api/admin/patch-notes/:importId/parse` | Parse imported text and recreate staging rows |
| `PATCH /api/admin/patch-notes/:importId/staging/:stagingId` | Edit review fields, map hero, or change staging status |
| `PATCH /api/admin/patch-notes/:importId/staging/:stagingId/relations/:relationId` | Remap a synergy/counter target hero |
| `POST /api/admin/patch-notes/:importId/apply` | Apply approved rows to public patch analysis tables |

## Parser Layers

| Layer | Responsibility | Output |
| --- | --- | --- |
| HTML fetcher | Download the official patch note URL and preserve raw HTML | `raw_html` |
| HTML cleaner | Extract article title, date, readable body text, and content hash | `title`, `patch_date`, `raw_text`, `content_hash` |
| Patch analyzer | Convert cleaned text into the app-level `PatchAnalysis` shape | `patchId`, summaries, `changes[]` |
| Staging mapper | Convert each `changes[]` item into reviewable staging rows | `patch_change_staging`, `patch_staging_relations` |
| Apply mapper | Convert approved staging rows into final public tables | `patch_notes`, `hero_changes`, relation tables |

## Parser Output Shape

The parser continues to target the existing app-level `PatchAnalysis` shape because the current UI and final save logic already understand it.

```ts
type PatchAnalysis = {
  patchId: string;
  patchTitle: string;
  patchDate: string;
  sourceUrl: string;
  overallSummary: string;
  metaSummary: string;
  changes: HeroChange[];
};

type HeroChange = {
  changeId: string;
  hero: {
    heroId: string;
    nameKo: string;
    nameEn: string;
    role: "TANK" | "DAMAGE" | "SUPPORT";
  };
  changeType: "BUFF" | "NERF" | "ADJUSTMENT" | "BUG_FIX";
  impactLevel: "LOW" | "MEDIUM" | "HIGH";
  originalChange: string;
  simpleSummary: string;
  metaImpact: string;
  affectedTiers: string[];
  recommendedPlaystyle: string;
  counterPicks: string[];
  synergyPicks: string[];
};
```

## Import Mapping

| Source | `patch_imports` column | Notes |
| --- | --- | --- |
| Submitted URL | `source_url` | Unique to prevent duplicate imports |
| Cleaned title | `title` | Nullable until fetch/clean or parse succeeds |
| Cleaned publish date | `patch_date` | Nullable because source date parsing can fail |
| Original response body | `raw_html` | Debug and reparse source |
| Cleaned article text | `raw_text` | Input to analyzer and final raw content |
| Hash of cleaned text | `content_hash` | Unique duplicate content detection |
| Import lifecycle | `status` | `IMPORTED`, `PARSED`, `REVIEWING`, `APPLIED`, `FAILED` |
| Failure reason | `error_message` | Last fetch/parse/apply error |
| Workflow timestamps | `imported_at`, `parsed_at`, `applied_at` | Milestone tracking |

## Parser To Staging Mapping

| `PatchAnalysis` field | Staging target | Notes |
| --- | --- | --- |
| `patchId` | `patch_change_staging.parsed_payload.patchId` | Stored in payload, not repeated as a column |
| `patchTitle` | `patch_imports.title` | Updates import title after parser if cleaner missed it |
| `patchDate` | `patch_imports.patch_date` | Updates import date after parser if cleaner missed it |
| `sourceUrl` | `patch_imports.source_url` | Should match submitted URL |
| `overallSummary` | `patch_change_staging.parsed_payload.overallSummary` | Applied later to `patch_notes` |
| `metaSummary` | `patch_change_staging.parsed_payload.metaSummary` | Applied later to `patch_notes` |
| `changes[].hero.heroId` | `patch_change_staging.hero_id` | Resolved against `heroes.hero_id`; nullable if unmatched |
| `changes[].hero.nameEn/nameKo` | `patch_change_staging.hero_name_raw` | Preserves parser/raw hero name for review |
| `changes[].changeType` | `patch_change_staging.change_type` | Nullable if parser cannot classify confidently |
| `changes[].impactLevel` | `patch_change_staging.impact_level` | Nullable if parser cannot classify confidently |
| `changes[].originalChange` | `patch_change_staging.original_change` | Required review text |
| `changes[].simpleSummary` | `patch_change_staging.simple_summary` | Editable before approval |
| `changes[].metaImpact` | `patch_change_staging.meta_impact` | Editable before approval |
| `changes[].recommendedPlaystyle` | `patch_change_staging.recommended_playstyle` | Editable before approval |
| Full `changes[]` item | `patch_change_staging.parsed_payload.change` | Keeps original structured parser result |
| Confidence details | `patch_change_staging.parsed_payload.confidenceBreakdown` | Explains review decision |
| Parser confidence | `patch_change_staging.confidence` | Decimal score between `0` and `1` |
| Review lifecycle | `patch_change_staging.status` | Starts as `PENDING`, `PENDING_REVIEW`, or `NEEDS_MAPPING` depending on confidence and mappings |

## Staging Relations Mapping

| Parser field | `patch_staging_relations.relation_type` | Other columns |
| --- | --- | --- |
| `affectedTiers[]` | `AFFECTED_TIER` | `value = tier`, `target_hero_id = null` |
| `synergyPicks[]` | `SYNERGY` | Resolve hero into `target_hero_id`; keep raw name in `value` |
| `counterPicks[]` | `COUNTER` | Resolve hero into `target_hero_id`; keep raw name in `value` |

`relation_type` is a string in Prisma and is validated by application logic. The helper SQL DDL also includes a database check constraint for direct SQL setups.

## Apply Mapping

The apply service validates an import, builds a `PatchAnalysis` from approved staging rows, then writes final public records through the existing patch analysis repository.

| Staging/import source | Final target | Notes |
| --- | --- | --- |
| `patch_imports.source_url` | `patch_notes.source_url` | Final source URL |
| `patch_imports.title` | `patch_notes.title` | Required before apply |
| `patch_imports.patch_date` | `patch_notes.patch_date` | Required before apply |
| `patch_imports.raw_text` | `patch_notes.raw_content` | Cleaned text is retained as final raw content |
| `parsed_payload.overallSummary` | `patch_notes.overall_summary` | Fallback text is used if payload is missing |
| `parsed_payload.metaSummary` | `patch_notes.meta_summary` | Fallback text is used if payload is missing |
| `parsed_payload.patchId` | `patch_notes.patch_id` | Falls back to `patch-import-{id}` |
| Approved staging row | `hero_changes` | One final row per approved hero change |
| `patch_change_staging.hero_id` | `hero_changes.hero_id` | Must be non-null before apply |
| `patch_change_staging.change_type` | `hero_changes.change_type` | Must be non-null before apply |
| `patch_change_staging.impact_level` | `hero_changes.impact_level` | Must be non-null before apply |
| `original_change` | `hero_changes.original_change` | Required |
| `simple_summary` | `hero_changes.simple_summary` | Required before apply |
| `meta_impact` | `hero_changes.meta_impact` | Required before apply |
| `recommended_playstyle` | `hero_changes.recommended_playstyle` | Required before apply |
| `AFFECTED_TIER` relations | `affected_tiers` | Created after `hero_changes` is upserted |
| `SYNERGY` relations | `hero_synergies` | Requires resolved `target_hero_id` |
| `COUNTER` relations | `hero_counters` | Requires resolved `target_hero_id` |
| Applied `hero_changes.id` | `patch_change_staging.applied_hero_change_id` | Links review draft to final row |

## Status Transitions

| Step | `patch_imports.status` | `patch_change_staging.status` |
| --- | --- | --- |
| URL submitted and HTML saved | `IMPORTED` | none |
| Parser succeeds and staging rows are saved | `REVIEWING` | `PENDING`, `PENDING_REVIEW`, or `NEEDS_MAPPING` |
| Parser fails | `FAILED` | none or previous staging rows remain replaced only on successful parse |
| Admin maps missing hero | `REVIEWING` | Review-selected status |
| Admin remaps synergy/counter relation | `REVIEWING` | Existing staging row status is preserved |
| Admin approves row | `REVIEWING` | `APPROVED` |
| Admin rejects row | `REVIEWING` | `REJECTED` |
| Approved rows applied | `APPLIED` | Applied approved rows become `APPLIED` |
| Apply validation fails | `REVIEWING` | Staging rows remain editable; failure log is written |
| Apply write fails | `FAILED` | Failed rows may be marked `FAILED` by repository error handling |

`PatchImportStatus.PARSED` exists in the enum for compatibility, but the current successful parser path marks the import as `REVIEWING` once staging rows are saved.

## Confidence Scoring

The staging mapper uses deterministic scoring before admin review.

| Condition | Score impact |
| --- | --- |
| Hero resolved to `heroes.id` | `+0.35` |
| `changeType` present | `+0.10` |
| `impactLevel` present | `+0.10` |
| `originalChange` present | `+0.15` |
| `simpleSummary`, `metaImpact`, `recommendedPlaystyle` present | `+0.05` each, max `+0.15` |
| Related heroes all resolved | `+0.10` |
| No related heroes present | `+0.05` |
| Numeric extraction is exact or not needed | `+0.10` |
| Numeric extraction is unclear | `+0.00` |

Rows with missing hero mapping become `NEEDS_MAPPING`. Rows with confidence less than or equal to `0.85`, unresolved related heroes, or unclear numeric extraction become `PENDING_REVIEW`. Higher confidence rows become `PENDING`; they are candidates for easier review, but the current apply flow still requires explicit `APPROVED` staging rows.

## Validation Before Apply

Apply requires:

- import status is `REVIEWING`;
- title, date, and cleaned raw text are present;
- at least one staging row is `APPROVED`;
- every approved row has a mapped hero, change type, impact level, original change, summaries, meta impact, and recommended playstyle;
- `SYNERGY` and `COUNTER` relations have resolved target heroes.

Failures are recorded in `patch_apply_logs`.
