-- Day4 staging 상태 보강 DDL입니다.
-- 이미 Day1 DDL을 실행한 Supabase 프로젝트에서는 enum type이 존재하므로,
-- 아래 ALTER TYPE만 추가 실행하면 검수용 상태값을 저장할 수 있습니다.

alter type "PatchStagingStatus" add value if not exists 'PENDING_REVIEW';
alter type "PatchStagingStatus" add value if not exists 'NEEDS_MAPPING';
