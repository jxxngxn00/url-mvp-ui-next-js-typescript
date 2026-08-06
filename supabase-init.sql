-- MVP initial schema and hero master data for Supabase SQL Editor.
-- Patch analysis rows are created through the patch import/review/apply flow.

do $$
begin
  create type "HeroRole" as enum ('TANK', 'DAMAGE', 'SUPPORT');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type "ChangeType" as enum ('BUFF', 'NERF', 'ADJUSTMENT', 'BUG_FIX');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type "ImpactLevel" as enum ('LOW', 'MEDIUM', 'HIGH');
exception
  when duplicate_object then null;
end $$;

create table if not exists heroes (
  id text primary key,
  hero_id text not null unique,
  name_ko text not null,
  name_en text not null,
  role "HeroRole" not null,
  difficulty integer,
  image_url text,
  created_at timestamp(3) not null default current_timestamp,
  updated_at timestamp(3) not null default current_timestamp
);

create table if not exists patch_notes (
  id text primary key,
  patch_id text not null unique,
  title text not null,
  patch_date date not null,
  source_url text not null,
  raw_content text,
  overall_summary text not null,
  meta_summary text not null,
  created_at timestamp(3) not null default current_timestamp,
  updated_at timestamp(3) not null default current_timestamp
);

create table if not exists hero_changes (
  id text primary key,
  change_id text not null unique,
  patch_note_id text not null references patch_notes(id) on delete cascade on update cascade,
  hero_id text not null references heroes(id) on delete restrict on update cascade,
  change_type "ChangeType" not null,
  impact_level "ImpactLevel" not null,
  original_change text not null,
  simple_summary text not null,
  meta_impact text not null,
  recommended_playstyle text not null,
  created_at timestamp(3) not null default current_timestamp,
  updated_at timestamp(3) not null default current_timestamp
);

create table if not exists affected_tiers (
  id text primary key,
  hero_change_id text not null references hero_changes(id) on delete cascade on update cascade,
  tier text not null,
  reason text,
  unique (hero_change_id, tier)
);

create table if not exists hero_synergies (
  id text primary key,
  hero_change_id text not null references hero_changes(id) on delete cascade on update cascade,
  target_hero_id text not null references heroes(id) on delete restrict on update cascade,
  reason text,
  unique (hero_change_id, target_hero_id)
);

create table if not exists hero_counters (
  id text primary key,
  hero_change_id text not null references hero_changes(id) on delete cascade on update cascade,
  target_hero_id text not null references heroes(id) on delete restrict on update cascade,
  reason text,
  unique (hero_change_id, target_hero_id)
);

create index if not exists heroes_role_idx on heroes(role);
create index if not exists patch_notes_patch_date_idx on patch_notes(patch_date);
create index if not exists hero_changes_patch_note_id_idx on hero_changes(patch_note_id);
create index if not exists hero_changes_hero_id_idx on hero_changes(hero_id);
create index if not exists hero_changes_change_type_idx on hero_changes(change_type);
create index if not exists hero_changes_impact_level_idx on hero_changes(impact_level);
create index if not exists hero_synergies_target_hero_id_idx on hero_synergies(target_hero_id);
create index if not exists hero_counters_target_hero_id_idx on hero_counters(target_hero_id);

insert into heroes (id, hero_id, name_ko, name_en, role, updated_at)
values
  ('hero_reinhardt', 'reinhardt', '라인하르트', 'Reinhardt', 'TANK', current_timestamp),
  ('hero_winston', 'winston', '윈스턴', 'Winston', 'TANK', current_timestamp),
  ('hero_bastion', 'bastion', '바스티온', 'Bastion', 'DAMAGE', current_timestamp),
  ('hero_genji', 'genji', '겐지', 'Genji', 'DAMAGE', current_timestamp),
  ('hero_mei', 'mei', '메이', 'Mei', 'DAMAGE', current_timestamp),
  ('hero_sojourn', 'sojourn', '소전', 'Sojourn', 'DAMAGE', current_timestamp),
  ('hero_sombra', 'sombra', '솜브라', 'Sombra', 'DAMAGE', current_timestamp),
  ('hero_tracer', 'tracer', '트레이서', 'Tracer', 'DAMAGE', current_timestamp),
  ('hero_ana', 'ana', '아나', 'Ana', 'SUPPORT', current_timestamp),
  ('hero_kiriko', 'kiriko', '키리코', 'Kiriko', 'SUPPORT', current_timestamp),
  ('hero_lucio', 'lucio', '루시우', 'Lucio', 'SUPPORT', current_timestamp),
  ('hero_mercy', 'mercy', '메르시', 'Mercy', 'SUPPORT', current_timestamp),
  ('hero_zenyatta', 'zenyatta', '젠야타', 'Zenyatta', 'SUPPORT', current_timestamp)
on conflict (hero_id) do update
set
  name_ko = excluded.name_ko,
  name_en = excluded.name_en,
  role = excluded.role,
  updated_at = current_timestamp;
