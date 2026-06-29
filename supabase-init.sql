-- Supabase SQL Editor에서 한 번에 실행할 수 있는 MVP 초기화 스크립트입니다.
-- 이미 데이터가 있으면 ON CONFLICT로 갱신되도록 구성했습니다.

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

insert into patch_notes (
  id,
  patch_id,
  title,
  patch_date,
  source_url,
  raw_content,
  overall_summary,
  meta_summary,
  updated_at
)
values (
  'patch_ow2_2026_06_sample',
  'ow2-2026-06-sample',
  '시즌 중반 밸런스 패치 샘플',
  date '2026-06-20',
  'https://overwatch.blizzard.com/patch-notes/',
  'MVP seed data generated from the local mock patch analysis.',
  '탱커 유지력은 낮추고, 교전 개시형 딜러와 보호형 지원가의 선택지를 넓히는 방향의 패치입니다.',
  '러시 조합은 진입 타이밍 관리가 더 중요해졌고, 포킹 조합은 중거리 압박을 안정적으로 이어갈 수 있습니다.',
  current_timestamp
)
on conflict (patch_id) do update
set
  title = excluded.title,
  patch_date = excluded.patch_date,
  source_url = excluded.source_url,
  raw_content = excluded.raw_content,
  overall_summary = excluded.overall_summary,
  meta_summary = excluded.meta_summary,
  updated_at = current_timestamp;

insert into hero_changes (
  id,
  change_id,
  patch_note_id,
  hero_id,
  change_type,
  impact_level,
  original_change,
  simple_summary,
  meta_impact,
  recommended_playstyle,
  updated_at
)
values
  (
    'hero_change_chg_reinhardt_01',
    'chg-reinhardt-01',
    'patch_ow2_2026_06_sample',
    'hero_reinhardt',
    'NERF',
    'MEDIUM',
    '방벽 방패 내구도가 감소했습니다.',
    '장시간 대치 능력이 줄어들었습니다.',
    '라인하르트 중심 러시는 여전히 가능하지만, 방벽으로 천천히 전진하는 운영은 더 큰 리스크를 가집니다.',
    '방벽을 아끼며 코너를 활용하고, 루시우 속도 증가나 메이 벽처럼 진입을 보장하는 자원과 함께 움직이세요.',
    current_timestamp
  ),
  (
    'hero_change_chg_sojourn_01',
    'chg-sojourn-01',
    'patch_ow2_2026_06_sample',
    'hero_sojourn',
    'BUFF',
    'HIGH',
    '레일건 보조 발사 충전 유지 시간이 증가했습니다.',
    '킬 결정력을 더 오래 유지할 수 있습니다.',
    '중거리 포킹과 고지대 장악 가치가 상승하며, 소전이 교전 시작 전부터 압박을 누적하기 쉬워졌습니다.',
    '고지대에서 충전을 보존한 뒤, 상대 지원가가 이동기를 사용한 직후 보조 발사로 마무리를 노리세요.',
    current_timestamp
  ),
  (
    'hero_change_chg_ana_01',
    'chg-ana-01',
    'patch_ow2_2026_06_sample',
    'hero_ana',
    'ADJUSTMENT',
    'MEDIUM',
    '생체 수류탄 회복량은 감소하고 피해량은 증가했습니다.',
    '수비형 회복보다 공격적 변수 창출에 무게가 실렸습니다.',
    '아나는 여전히 강력한 유틸리티 지원가지만, 팀 생존을 혼자 버티는 능력은 조금 낮아졌습니다.',
    '수류탄을 아군 회복용으로만 쓰기보다, 상대 탱커가 방어 자원을 소모한 순간 공격적으로 던지세요.',
    current_timestamp
  )
on conflict (change_id) do update
set
  patch_note_id = excluded.patch_note_id,
  hero_id = excluded.hero_id,
  change_type = excluded.change_type,
  impact_level = excluded.impact_level,
  original_change = excluded.original_change,
  simple_summary = excluded.simple_summary,
  meta_impact = excluded.meta_impact,
  recommended_playstyle = excluded.recommended_playstyle,
  updated_at = current_timestamp;

delete from affected_tiers
where hero_change_id in (
  'hero_change_chg_reinhardt_01',
  'hero_change_chg_sojourn_01',
  'hero_change_chg_ana_01'
);

insert into affected_tiers (id, hero_change_id, tier)
values
  ('tier_chg_reinhardt_01_gold', 'hero_change_chg_reinhardt_01', 'Gold'),
  ('tier_chg_reinhardt_01_platinum', 'hero_change_chg_reinhardt_01', 'Platinum'),
  ('tier_chg_reinhardt_01_diamond', 'hero_change_chg_reinhardt_01', 'Diamond'),
  ('tier_chg_sojourn_01_platinum', 'hero_change_chg_sojourn_01', 'Platinum'),
  ('tier_chg_sojourn_01_diamond', 'hero_change_chg_sojourn_01', 'Diamond'),
  ('tier_chg_sojourn_01_master_plus', 'hero_change_chg_sojourn_01', 'Master+'),
  ('tier_chg_ana_01_silver', 'hero_change_chg_ana_01', 'Silver'),
  ('tier_chg_ana_01_gold', 'hero_change_chg_ana_01', 'Gold'),
  ('tier_chg_ana_01_platinum', 'hero_change_chg_ana_01', 'Platinum'),
  ('tier_chg_ana_01_diamond', 'hero_change_chg_ana_01', 'Diamond');

delete from hero_synergies
where hero_change_id in (
  'hero_change_chg_reinhardt_01',
  'hero_change_chg_sojourn_01',
  'hero_change_chg_ana_01'
);

insert into hero_synergies (id, hero_change_id, target_hero_id)
values
  ('synergy_chg_reinhardt_01_lucio', 'hero_change_chg_reinhardt_01', 'hero_lucio'),
  ('synergy_chg_reinhardt_01_mei', 'hero_change_chg_reinhardt_01', 'hero_mei'),
  ('synergy_chg_sojourn_01_mercy', 'hero_change_chg_sojourn_01', 'hero_mercy'),
  ('synergy_chg_sojourn_01_kiriko', 'hero_change_chg_sojourn_01', 'hero_kiriko'),
  ('synergy_chg_ana_01_winston', 'hero_change_chg_ana_01', 'hero_winston'),
  ('synergy_chg_ana_01_genji', 'hero_change_chg_ana_01', 'hero_genji');

delete from hero_counters
where hero_change_id in (
  'hero_change_chg_reinhardt_01',
  'hero_change_chg_sojourn_01',
  'hero_change_chg_ana_01'
);

insert into hero_counters (id, hero_change_id, target_hero_id)
values
  ('counter_chg_reinhardt_01_bastion', 'hero_change_chg_reinhardt_01', 'hero_bastion'),
  ('counter_chg_reinhardt_01_zenyatta', 'hero_change_chg_reinhardt_01', 'hero_zenyatta'),
  ('counter_chg_sojourn_01_winston', 'hero_change_chg_sojourn_01', 'hero_winston'),
  ('counter_chg_sojourn_01_sombra', 'hero_change_chg_sojourn_01', 'hero_sombra'),
  ('counter_chg_ana_01_tracer', 'hero_change_chg_ana_01', 'hero_tracer'),
  ('counter_chg_ana_01_kiriko', 'hero_change_chg_ana_01', 'hero_kiriko');
