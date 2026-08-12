-- Historical helper DDL for adding review-specific staging statuses.
-- Last reviewed: 2026-08-07.
--
-- prisma/schema.prisma is the canonical schema and already includes these enum
-- values. Use this SQL only for an older database that was initialized before
-- PENDING_REVIEW and NEEDS_MAPPING were added.

alter type "PatchStagingStatus" add value if not exists 'PENDING_REVIEW';
alter type "PatchStagingStatus" add value if not exists 'NEEDS_MAPPING';
