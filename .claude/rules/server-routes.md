---
name: server-routes
description: Rules for Express route handlers under server/routes/
paths:
  - oikos/server/routes/**/*.js
---

- Every route handler wraps its body in `try/catch`. The catch path logs via the existing logger and returns `{ error: string, code: number }` with an appropriate HTTP status. No unhandled promise rejections.
- Success responses return `{ data: ... }`. Never return a raw array or primitive.
- Validate input at the boundary: request body, params, query. Reject with 400 on malformed input before touching the DB.
- Session + CSRF are enforced by middleware in `server/middleware/`. Don't re-implement auth inside a handler. Don't skip CSRF on mutating routes.
- Dates: accept and emit ISO 8601 strings. Store as TEXT in SQLite. Convert to `Date` only at the edges.
- `better-sqlite3` is synchronous. Never `await` a `db.prepare()` / `.run()` / `.get()` / `.all()` call. If you find an `await` in front of a db call, it's a bug.
- No `innerHTML` anywhere (server-side string building into HTML is fine as long as it doesn't end up in a frontend `innerHTML`; prefer JSON).
- Route files export a factory `(db) => router` pattern consistent with existing files in this directory. Read a neighbour file before adding a new one.
