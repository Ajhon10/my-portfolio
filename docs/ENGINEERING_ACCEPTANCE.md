# Deployment engineering acceptance

Date: 20 October 2026 (Asia/Manila).
Source: working-tree changes over `1c5ad5dfb45dae528765ba7d9dc8e10c8ef56923`;
not committed or deployed by this task.
Scope: adapt MY_PORTFOLIO for separate Vue/Vite and NestJS Vercel projects.
Stack: existing TypeScript, Vue 3, NestJS 10, Prisma 5, PostgreSQL.
Local runtime: Windows, Node.js 22.21.0. Added Blob SDK 2.8.2, Socket.IO Redis
adapter 8.3.0 and ioredis 6.0.0 with checked-in npm lockfiles.
Architecture: see `vercel-architecture.md`.
Users: public visitors, CLIENT accounts, ADMIN and OWNER CMS accounts.
Data: account credentials, inquiries and chat are private database records;
portfolio images and certificates uploaded to public Blob storage are public.
Operator/reviewer: user; external services and domain choices remain open.
Workload/latency/cost/RPO/RTO objectives: not supplied; no capacity claim is made.

| Area | Implementation | Local evidence | Deployment / acceptance |
| --- | --- | --- | --- |
| Vercel app configuration | Separate roots, locked installs, native NestJS/Vite settings, frontend SPA rewrite | Both npm builds pass; actual Vercel builder/account untested | Not deployed |
| Durable uploads and upload authorization | Direct browser-to-Blob uploads; scoped 5-minute tokens; owner/admin guards; project/metadata verification; local development fallback | HTTP authorization and local multipart tests pass; real SDK token signing tested offline; Blob metadata mocked | Live Blob checks and existing-file transfer pending |
| Distributed realtime and reconnect | Redis adapter; global room queries; shared notification routing; WebSocket transport; client subscription/history recovery | Actual local NestJS/Socket.IO handshake, takeover/disconnect and history tests pass; remote-instance query results tested with adapter stubs; frontend replay tests pass | Live Redis and multi-instance Vercel checks pending; WebSocket support is beta |
| PostgreSQL generation and release migrations | Explicit generation/build and direct-connection migration command; no automatic preview migration | Prisma 5.22 generation and backend build pass; migration wrapper passes Node syntax check | No cloud database connection or migration executed; backup/restore pending |
| Security and dependency checks | Upload token role/scope enforcement; live socket role lookup; credential-free environment errors; production seed requires supplied owner credentials | Anonymous/client upload denial, deleted socket account and stale token role tests pass; runtime audits compared with original lockfiles | Pre-existing dependency findings unresolved; production release not accepted |
| Existing application regressions | Existing stack retained | Existing chatbot/context/photography suites pass; frontend type-check and bundle pass | Full browser/device/mail/cloud acceptance pending |

## Executed checks

- Backend `npm.cmd run build:vercel`: PASS (Prisma generation and Nest build).
- Backend `npm.cmd test -- --runInBand`: PASS, 8 suites / 44 tests.
- Frontend `npm.cmd run build`: PASS (Vue type-check and Vite production bundle).
- Frontend `npm.cmd test`: PASS, 3 subscription-recovery tests.
- `node --check scripts/migrate.cjs`: PASS; no database mutation performed.
- `git diff --check`: PASS. Git reports existing LF/CRLF conversion warnings.
- Both Vercel configuration files parse as JSON. Full validation against the live
  Vercel JSON Schema is inconclusive: its draft-04 declaration conflicts with
  numeric `exclusiveMinimum` in unused experimental-trigger definitions. The
  standalone Vercel build remains a required cloud check.

The HTTP tests use synthetic owner/client JWTs and a fake database. Local
WebSocket integration uses the actual Nest gateway, Socket.IO server/client and
the adapter's single-process development mode. It does not connect to Redis.
Distributed room tests inject remote socket results; they do not prove Redis
Pub/Sub delivery, Vercel upgrade routing or behavior under production traffic.
Visitor reconnect sync recovers stored administrator replies; project and admin
views reload their selected stored conversations. No capacity tests were run.

Initial checks exposed an optional timestamp type error (fixed), missing
reflection metadata in a test fixture (fixed), and a test transpilation target
that could not iterate Sets (corrected to ES2021). The sandbox initially denied
esbuild's ancestor-directory lookup; the normal frontend build passed when run
with the required filesystem access. Final check results are listed above.

## Dependency audit remains open

Runtime-only npm audits were compared against the original Git lockfiles:

| App | Original | Updated | New vulnerable package names |
| --- | --- | --- | --- |
| Backend | 26: 1 low, 12 moderate, 12 high, 1 critical | Same | None |
| Frontend | 10: 1 moderate, 9 high | Same | None |

The backend critical finding names `proxy-addr`; the audit reports a fix is
available. These counts describe npm advisory results, not an exploitability
assessment. The dependency remediation and associated regression checks are
unresolved release work; no exception or production approval is claimed.

## Dependency and source identity

SHA-256 of the tested lockfiles:

- `portfolio-client/package-lock.json`: `914972d11ce5905bcc5094d077ac57cad78d1684c7e657e7263dd16e01d73f2c`
- `portfolio-server/package-lock.json`: `3a2fe6b2fba19f61ba0c84db19de6fdc692be0708fa31ba0484011fc0dbea3ea`

The source state is an uncommitted working tree, not a signed release artifact.
Combined source SHA-256: `e98f7a65886d637fe078570e4e467a12cb9ab6df30c36ea5fe6d88a331da0d04`
(225 unique files: both `src` trees, both package manifests/lockfiles and Vercel
configs, the migration wrapper, and the frontend reconnect test; sorted normalized
paths, each path and its bytes separated by NUL).

Provisioning, production migration, existing-file transfer, live smoke checks,
rollback rehearsal, backup restoration and workload acceptance remain explicit
operator steps. Local builds and synthetic tests do not establish those states.

Release state: implemented and locally verified for the stated scope; **not
deployed and not accepted under production workload**. Production release also
requires dependency remediation. No cloud resource, production migration or
existing-upload transfer was executed.
