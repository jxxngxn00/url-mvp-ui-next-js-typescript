-- Day 1 DDL draft for the manual URL based semi-automated patch update flow.
-- This script only adds import/review/apply tables. Existing public-facing
-- tables such as patch_notes and hero_changes remain the final applied data.

do $$
begin
  create type "PatchImportStatus" as enum (
    'IMPORTED',
    'PARSED',
    'REVIEWING',
    'APPLIED',
    'FAILED'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type "PatchStagingStatus" as enum (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'APPLIED',
    'FAILED'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type "PatchApplyAction" as enum (
    'IMPORT',
    'PARSE',
    'APPROVE',
    'REJECT',
    'APPLY',
    'RETRY'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type "PatchApplyStatus" as enum (
    'SUCCESS',
    'FAILED'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists patch_imports (
  id text primary key,
  source_url text not null unique,
  title text,
  patch_date date,
  raw_html text,
  raw_text text,
  content_hash text unique,
  status "PatchImportStatus" not null default 'IMPORTED',
  error_message text,
  imported_at timestamp(3) not null default current_timestamp,
  parsed_at timestamp(3),
  applied_at timestamp(3),
  created_at timestamp(3) not null default current_timestamp,
  updated_at timestamp(3) not null default current_timestamp
);

create table if not exists patch_change_staging (
  id text primary key,
  patch_import_id text not null references patch_imports(id) on delete cascade on update cascade,
  hero_id text references heroes(id) on delete restrict on update cascade,
  hero_name_raw text not null,
  ability_name text,
  change_type "ChangeType",
  impact_level "ImpactLevel",
  original_change text not null,
  simple_summary text,
  meta_impact text,
  recommended_playstyle text,
  parsed_payload jsonb not null default '{}'::jsonb,
  confidence numeric(4, 3) not null default 0,
  status "PatchStagingStatus" not null default 'PENDING',
  reviewer_note text,
  reviewed_at timestamp(3),
  applied_hero_change_id text references hero_changes(id) on delete set null on update cascade,
  created_at timestamp(3) not null default current_timestamp,
  updated_at timestamp(3) not null default current_timestamp,
  constraint patch_change_staging_confidence_range check (
    confidence >= 0 and confidence <= 1
  )
);

create table if not exists patch_staging_relations (
  id text primary key,
  staging_change_id text not null references patch_change_staging(id) on delete cascade on update cascade,
  relation_type text not null,
  value text,
  target_hero_id text references heroes(id) on delete restrict on update cascade,
  reason text,
  created_at timestamp(3) not null default current_timestamp,
  constraint patch_staging_relations_relation_type_check check (
    relation_type in ('AFFECTED_TIER', 'SYNERGY', 'COUNTER')
  )
);

create table if not exists patch_apply_logs (
  id text primary key,
  patch_import_id text references patch_imports(id) on delete set null on update cascade,
  staging_change_id text references patch_change_staging(id) on delete set null on update cascade,
  action "PatchApplyAction" not null,
  status "PatchApplyStatus" not null,
  message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp(3) not null default current_timestamp
);

create index if not exists patch_imports_status_idx on patch_imports(status);
create index if not exists patch_imports_patch_date_idx on patch_imports(patch_date);
create index if not exists patch_imports_content_hash_idx on patch_imports(content_hash);

create index if not exists patch_change_staging_patch_import_id_idx
  on patch_change_staging(patch_import_id);
create index if not exists patch_change_staging_hero_id_idx
  on patch_change_staging(hero_id);
create index if not exists patch_change_staging_status_idx
  on patch_change_staging(status);
create index if not exists patch_change_staging_change_type_idx
  on patch_change_staging(change_type);

create index if not exists patch_staging_relations_staging_change_id_idx
  on patch_staging_relations(staging_change_id);
create index if not exists patch_staging_relations_target_hero_id_idx
  on patch_staging_relations(target_hero_id);
create index if not exists patch_staging_relations_relation_type_idx
  on patch_staging_relations(relation_type);

create index if not exists patch_apply_logs_patch_import_id_idx
  on patch_apply_logs(patch_import_id);
create index if not exists patch_apply_logs_staging_change_id_idx
  on patch_apply_logs(staging_change_id);
create index if not exists patch_apply_logs_action_idx
  on patch_apply_logs(action);
create index if not exists patch_apply_logs_status_idx
  on patch_apply_logs(status);
