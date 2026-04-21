---
name: db-migrations
description: Append-only migration rules for server/db.js
paths:
  - oikos/server/db.js
---

- The `migrations` array in this file is **append-only**. Never modify, reorder, split, merge, or delete an existing entry. Even fixing a typo in an existing migration SQL string is forbidden.
- New work goes into a NEW entry appended to the end of the array. Give it the next monotonic `version` number.
- Each migration's SQL must be idempotent where possible (`CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN` guarded by a prior check). Runtime catches errors and logs them but the migration should not need the catch to succeed.
- The `schema_migrations` table tracks which versions have run on a given DB. Changing or renumbering an existing entry silently skips the change on every upgraded install — which is why the append-only rule exists.
- If you need to fix a bad migration, append a new migration that performs the fix. Never rewrite history.
- Production DBs may have data created by every prior migration. Test new migrations against a copy of a populated DB when the change touches existing tables.
- No data loss migrations without explicit user sign-off in the PR description. Adding a column with `NOT NULL` and no default on a populated table counts as data loss.
