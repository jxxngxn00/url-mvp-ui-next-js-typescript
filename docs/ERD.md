# ERD

Last updated: 2026-08-07

Source: `docs/DATA_MODEL.md` and `prisma/schema.prisma`.

## Full Data Model ERD

```mermaid
erDiagram
  HERO {
    string id PK
    string hero_id UK
    string name_ko
    string name_en
    HeroRole role
    int difficulty
    string image_url
    datetime created_at
    datetime updated_at
  }

  PATCH_NOTE {
    string id PK
    string patch_id UK
    string title
    date patch_date
    string source_url
    string raw_content
    string overall_summary
    string meta_summary
    datetime created_at
    datetime updated_at
  }

  HERO_CHANGE {
    string id PK
    string change_id UK
    string patch_note_id FK
    string hero_id FK
    ChangeType change_type
    ImpactLevel impact_level
    string original_change
    string simple_summary
    string meta_impact
    string recommended_playstyle
    datetime created_at
    datetime updated_at
  }

  AFFECTED_TIER {
    string id PK
    string hero_change_id FK
    string tier
    string reason
  }

  HERO_SYNERGY {
    string id PK
    string hero_change_id FK
    string target_hero_id FK
    string reason
  }

  HERO_COUNTER {
    string id PK
    string hero_change_id FK
    string target_hero_id FK
    string reason
  }

  PATCH_IMPORT {
    string id PK
    string source_url UK
    string title
    date patch_date
    string raw_html
    string raw_text
    string content_hash UK
    PatchImportStatus status
    string error_message
    datetime imported_at
    datetime parsed_at
    datetime applied_at
    datetime created_at
    datetime updated_at
  }

  PATCH_CHANGE_STAGING {
    string id PK
    string patch_import_id FK
    string hero_id FK
    string hero_name_raw
    string ability_name
    ChangeType change_type
    ImpactLevel impact_level
    string original_change
    string simple_summary
    string meta_impact
    string recommended_playstyle
    json parsed_payload
    decimal confidence
    PatchStagingStatus status
    string reviewer_note
    datetime reviewed_at
    string applied_hero_change_id FK
    datetime created_at
    datetime updated_at
  }

  PATCH_STAGING_RELATION {
    string id PK
    string staging_change_id FK
    string relation_type
    string value
    string target_hero_id FK
    string reason
    datetime created_at
  }

  PATCH_APPLY_LOG {
    string id PK
    string patch_import_id FK
    string staging_change_id FK
    PatchApplyAction action
    PatchApplyStatus status
    string message
    json metadata
    datetime created_at
  }

  HERO ||--o{ HERO_CHANGE : has_changes
  PATCH_NOTE ||--o{ HERO_CHANGE : contains
  HERO_CHANGE ||--o{ AFFECTED_TIER : affects_tiers
  HERO_CHANGE ||--o{ HERO_SYNERGY : recommends_synergy
  HERO_CHANGE ||--o{ HERO_COUNTER : warns_counter
  HERO ||--o{ HERO_SYNERGY : synergy_target
  HERO ||--o{ HERO_COUNTER : counter_target

  PATCH_IMPORT ||--o{ PATCH_CHANGE_STAGING : stages
  PATCH_IMPORT ||--o{ PATCH_APPLY_LOG : writes_logs
  PATCH_CHANGE_STAGING ||--o{ PATCH_STAGING_RELATION : has_relations
  PATCH_CHANGE_STAGING ||--o{ PATCH_APPLY_LOG : writes_logs
  HERO ||--o{ PATCH_CHANGE_STAGING : mapped_hero
  HERO ||--o{ PATCH_STAGING_RELATION : relation_target
  HERO_CHANGE ||--o{ PATCH_CHANGE_STAGING : applied_from
```

## Public Analysis Area

```mermaid
erDiagram
  HERO ||--o{ HERO_CHANGE : has_changes
  PATCH_NOTE ||--o{ HERO_CHANGE : contains
  HERO_CHANGE ||--o{ AFFECTED_TIER : affects_tiers
  HERO_CHANGE ||--o{ HERO_SYNERGY : recommends_synergy
  HERO_CHANGE ||--o{ HERO_COUNTER : warns_counter
  HERO ||--o{ HERO_SYNERGY : synergy_target
  HERO ||--o{ HERO_COUNTER : counter_target

  HERO {
    string id PK
    string hero_id UK
    string name_ko
    string name_en
    HeroRole role
  }

  PATCH_NOTE {
    string id PK
    string patch_id UK
    date patch_date
    string title
  }

  HERO_CHANGE {
    string id PK
    string change_id UK
    string patch_note_id FK
    string hero_id FK
    ChangeType change_type
    ImpactLevel impact_level
  }

  AFFECTED_TIER {
    string id PK
    string hero_change_id FK
    string tier
  }

  HERO_SYNERGY {
    string id PK
    string hero_change_id FK
    string target_hero_id FK
  }

  HERO_COUNTER {
    string id PK
    string hero_change_id FK
    string target_hero_id FK
  }
```

## Patch Update Workflow Area

```mermaid
erDiagram
  PATCH_IMPORT ||--o{ PATCH_CHANGE_STAGING : stages
  PATCH_IMPORT ||--o{ PATCH_APPLY_LOG : writes_logs
  PATCH_CHANGE_STAGING ||--o{ PATCH_STAGING_RELATION : has_relations
  PATCH_CHANGE_STAGING ||--o{ PATCH_APPLY_LOG : writes_logs
  HERO ||--o{ PATCH_CHANGE_STAGING : mapped_hero
  HERO ||--o{ PATCH_STAGING_RELATION : relation_target
  HERO_CHANGE ||--o{ PATCH_CHANGE_STAGING : applied_from

  PATCH_IMPORT {
    string id PK
    string source_url UK
    string content_hash UK
    PatchImportStatus status
  }

  PATCH_CHANGE_STAGING {
    string id PK
    string patch_import_id FK
    string hero_id FK
    string applied_hero_change_id FK
    decimal confidence
    PatchStagingStatus status
  }

  PATCH_STAGING_RELATION {
    string id PK
    string staging_change_id FK
    string relation_type
    string target_hero_id FK
  }

  PATCH_APPLY_LOG {
    string id PK
    string patch_import_id FK
    string staging_change_id FK
    PatchApplyAction action
    PatchApplyStatus status
  }

  HERO {
    string id PK
    string hero_id UK
  }

  HERO_CHANGE {
    string id PK
    string change_id UK
  }
```

## Relationship Notes

- `PATCH_NOTE` deletes cascade to `HERO_CHANGE`.
- `HERO_CHANGE` deletes cascade to `AFFECTED_TIER`, `HERO_SYNERGY`, and `HERO_COUNTER`.
- `PATCH_IMPORT` deletes cascade to `PATCH_CHANGE_STAGING`.
- `PATCH_CHANGE_STAGING` deletes cascade to `PATCH_STAGING_RELATION`.
- `PATCH_APPLY_LOG` preserves audit rows with nullable `patch_import_id` and `staging_change_id`.
- `HERO` deletion is restricted while public changes, synergies, counters, staging rows, or staging relations reference it.
- `PATCH_CHANGE_STAGING.applied_hero_change_id` is nullable until the approved staging row is applied.
