# Patch Update Parser and Mapping Plan

## Parser Strategy

The manual URL based update system should not write parser output directly to
the public patch tables. It should produce a reviewed staging draft first, then
apply only approved rows to the existing final tables.

```txt
Admin URL input
-> fetch official patch note HTML
-> extract title/date/body text
-> save patch_imports
-> parse raw_text into PatchAnalysis JSON
-> convert PatchAnalysis changes into patch_change_staging
-> admin review/edit/approve
-> apply approved staging rows to final tables
```

## Parser Layers

| Layer | Responsibility | Output |
|---|---|---|
| HTML fetcher | Download the official patch note URL and preserve raw HTML | `raw_html` |
| HTML cleaner | Extract article title, date, and readable body text from Blizzard HTML | `title`, `patch_date`, `raw_text`, `content_hash` |
| Patch analyzer | Convert cleaned text into the existing `PatchAnalysis` JSON shape | `patchId`, summaries, `changes[]` |
| Staging mapper | Convert each `changes[]` item into reviewable staging rows | `patch_change_staging`, `patch_staging_relations` |
| Apply mapper | Convert approved staging rows into final public tables | `patch_notes`, `hero_changes`, relation tables |

## Parser Output Shape

The parser should continue to target the existing app-level `PatchAnalysis`
shape because the current UI and final save logic already understand it.

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
|---|---|---|
| Submitted URL | `source_url` | Unique to prevent duplicate imports |
| Cleaned title | `title` | Nullable until fetch/clean succeeds |
| Cleaned publish date | `patch_date` | Nullable because Blizzard date parsing can fail |
| Original response body | `raw_html` | Debug/reparse source |
| Cleaned article text | `raw_text` | Input to analyzer |
| Hash of cleaned text | `content_hash` | Duplicate content detection |
| Import lifecycle | `status` | `IMPORTED`, `PARSED`, `REVIEWING`, `APPLIED`, `FAILED` |
| Failure reason | `error_message` | Last fetch/parse/apply error |

## Parser To Staging Mapping

| `PatchAnalysis` field | Staging target | Notes |
|---|---|---|
| `patchId` | `patch_change_staging.parsed_payload.patchId` | Stored in payload, not repeated as a column |
| `patchTitle` | `patch_imports.title` | Update import title after parser if cleaner missed it |
| `patchDate` | `patch_imports.patch_date` | Update import date after parser if cleaner missed it |
| `sourceUrl` | `patch_imports.source_url` | Should match submitted URL |
| `overallSummary` | `patch_change_staging.parsed_payload.overallSummary` | Applied later to `patch_notes` |
| `metaSummary` | `patch_change_staging.parsed_payload.metaSummary` | Applied later to `patch_notes` |
| `changes[].hero.heroId` | `patch_change_staging.hero_id` | Resolve against `heroes.hero_id`; nullable if unmatched |
| `changes[].hero.nameEn/nameKo` | `patch_change_staging.hero_name_raw` | Preserve parser/raw hero name for review |
| `changes[].changeType` | `patch_change_staging.change_type` | Nullable if parser cannot classify confidently |
| `changes[].impactLevel` | `patch_change_staging.impact_level` | Nullable if parser cannot classify confidently |
| `changes[].originalChange` | `patch_change_staging.original_change` | Required review text |
| `changes[].simpleSummary` | `patch_change_staging.simple_summary` | Editable before approval |
| `changes[].metaImpact` | `patch_change_staging.meta_impact` | Editable before approval |
| `changes[].recommendedPlaystyle` | `patch_change_staging.recommended_playstyle` | Editable before approval |
| Full `changes[]` item | `patch_change_staging.parsed_payload` | Keeps original structured parser result |
| Parser confidence | `patch_change_staging.confidence` | Start with rule-based score, improve later |
| Review lifecycle | `patch_change_staging.status` | Starts as `PENDING` |

## Staging Relations Mapping

| Parser field | `patch_staging_relations.relation_type` | Other columns |
|---|---|---|
| `affectedTiers[]` | `AFFECTED_TIER` | `value = tier`, `target_hero_id = null` |
| `synergyPicks[]` | `SYNERGY` | Resolve hero into `target_hero_id`; keep raw name in `value` |
| `counterPicks[]` | `COUNTER` | Resolve hero into `target_hero_id`; keep raw name in `value` |

## Apply Mapping

When an admin approves staging rows, the apply service should write the final
public records in one transaction.

| Staging/import source | Final target | Notes |
|---|---|---|
| `patch_imports.id` | Internal apply lookup | Not exposed publicly |
| `patch_imports.source_url` | `patch_notes.source_url` | Final source URL |
| `patch_imports.title` | `patch_notes.title` | Required before apply |
| `patch_imports.patch_date` | `patch_notes.patch_date` | Required before apply |
| `patch_imports.raw_text` | `patch_notes.raw_content` | Keep cleaned text as final raw content |
| `parsed_payload.overallSummary` | `patch_notes.overall_summary` | Can be edited later if needed |
| `parsed_payload.metaSummary` | `patch_notes.meta_summary` | Can be edited later if needed |
| Generated stable patch id | `patch_notes.patch_id` | Prefer slug from date/title/source URL |
| Approved staging row | `hero_changes` | One row per approved hero change |
| `patch_change_staging.hero_id` | `hero_changes.hero_id` | Must be non-null before apply |
| `patch_change_staging.change_type` | `hero_changes.change_type` | Must be non-null before apply |
| `patch_change_staging.impact_level` | `hero_changes.impact_level` | Must be non-null before apply |
| `original_change` | `hero_changes.original_change` | Required |
| `simple_summary` | `hero_changes.simple_summary` | Required before apply |
| `meta_impact` | `hero_changes.meta_impact` | Required before apply |
| `recommended_playstyle` | `hero_changes.recommended_playstyle` | Required before apply |
| `AFFECTED_TIER` relations | `affected_tiers` | Create rows after `hero_changes` upsert |
| `SYNERGY` relations | `hero_synergies` | Requires resolved `target_hero_id` |
| `COUNTER` relations | `hero_counters` | Requires resolved `target_hero_id` |
| Applied `hero_changes.id` | `patch_change_staging.applied_hero_change_id` | Links review draft to final row |

## Status Transitions

| Step | `patch_imports.status` | `patch_change_staging.status` |
|---|---|---|
| URL submitted and HTML saved | `IMPORTED` | none |
| Parser succeeds and staging rows created | `REVIEWING` | `PENDING` |
| Parser fails | `FAILED` | none or `FAILED` |
| Admin approves row | `REVIEWING` | `APPROVED` |
| Admin rejects row | `REVIEWING` | `REJECTED` |
| Approved rows applied | `APPLIED` | `APPLIED` |
| Apply fails | `FAILED` | `FAILED` for failed rows |

## Confidence Scoring MVP

Start with simple deterministic scoring instead of trying to make the first
parser perfect.

| Condition | Score impact |
|---|---|
| Hero resolved to `heroes.id` | +0.35 |
| `changeType` present | +0.15 |
| `impactLevel` present | +0.10 |
| `originalChange` present | +0.15 |
| Summary/playstyle fields present | +0.15 |
| Synergy/counter names resolved when present | +0.10 |

Rows below `0.8` should be highlighted for admin review. No row should auto-apply
in the MVP.

## Day 2 Implementation Checklist

| Task | Target |
|---|---|
| Create URL import API | `POST /api/admin/patch-notes/import` |
| Add HTML fetch/clean helper | `src/features/patch-update/importer.ts` |
| Reuse LLM analyzer for structured JSON | `analyzePatchWithLlm` |
| Add staging save service | `src/features/patch-update/staging-repository.ts` |
| Log import/parse failures | `patch_apply_logs` |
