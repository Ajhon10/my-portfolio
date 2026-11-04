# Portfolio game mode

Implemented: 28 October 2026. This document records the source design; it is not deployment or workload acceptance evidence.

## Product and architecture

- Existing Vue 3 client, NestJS server, Prisma, and PostgreSQL are preserved.
- The game is controlled by its own hero switch, independently of the particle/portrait selector. A transparent fixed canvas draws a code-native pet and platforms while the selected portrait and normal portfolio content remain visible and clickable.
- Game physics run only in the visitor's browser. Sound is generated with Web Audio after interaction; no audio or pet asset is downloaded.
- A collapsible right-side settings panel contains score, game visibility, sound, leaderboard, restart, and exit controls. Visibility changes only the canvas pet/platform layer and is remembered on that browser.
- Score is derived only from new upward camera progress. Landing or bouncing again at the same height does not add points.
- The leaderboard is a casual public feature, not a server-authoritative competitive game. Client scores can be manipulated by a determined visitor.
- Stored data is limited to the visitor's chosen public display name, integer score, and creation time. No account or contact information is required.

## API contract

### `GET /api/game-scores?limit=10`

- Caller: public visitor.
- Input: optional integer `limit`, 1 through 25; default 10.
- Output: `{ success, message, data }`, where data contains only `id`, `name`, `score`, and `createdAt`.
- Ordering: score descending, then earlier creation time for ties.
- Side effects: none.
- Rate limit: 60 requests per IP per minute per running API instance.
- Cache: none in the application. Responses are small and intentionally current.

### `POST /api/game-scores`

- Caller: public visitor.
- Input: public name 2–24 characters and integer score 0–1,000,000.
- Name characters: Unicode letters/numbers, spaces, periods, underscores, and hyphens.
- Output: the created public score fields.
- Side effect: one durable leaderboard row.
- Retry: not idempotent. The UI disables repeat submission for the completed run.
- Rate limit: 5 requests per IP per minute per running API instance.

## Security and operational limits

- DTO validation and a database check constraint bound score values; the database field bounds the name.
- Vue renders names as text, preventing submitted names from being interpreted as markup.
- Rate limiting uses Nest's in-process storage. Multi-instance production requires a shared throttler store before claiming a global limit.
- The top-score index supports the bounded leaderboard query.
- Retention and moderation controls are not yet specified. Operators can remove records directly from the database until an admin moderation workflow is requested.

## Evidence state

- Source implementation: complete.
- Local verification: client type-check/production build and 3 client tests pass; server build, Prisma validation, and 50 server tests pass. A local `GET /api/game-scores?limit=10` smoke request returned HTTP 200 after migration.
- Database migration: applied successfully to the local `portfolio` PostgreSQL database on `localhost:5432`; not applied to any shared or production database.
- Deployment: not performed.
- Intended-workload acceptance: not performed; no concurrent-user or capacity target was supplied.
