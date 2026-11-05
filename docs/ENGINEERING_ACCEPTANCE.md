# Unified portfolio verification

Recorded 5 November 2026. Branch: `feat/cloudflare-unified`. Original source
commit: `f0af8e64d204031748b6293083e2166ada341049`.

## Release state

| State                  | Evidence                                                                                                                                                        |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Implemented            | One Vue/Workers root package, same-origin API/uploads/WebSocket, D1 SQL schema and SQLite Durable Object. Original Vue design and CMS/client features retained. |
| Locally verified       | TypeScript checks, build, 3 subscription tests, 79 Worker integration checks, browser flows and read-only production preview passed.                            |
| Data restored locally  | 184 PostgreSQL records across 20 models and 14 media files restored to local D1. Original PostgreSQL was read only.                                             |
| Deploy package checked | Wrangler dry run: 389.10 KiB raw, 84.77 KiB gzip; D1, SQLite DO and Assets bindings only. No remote write or deployment.                                        |
| Deployed               | Not performed. Real D1 ID, runtime AUTH_SECRET and remote database import/provisioning remain account setup steps.                                              |
| Workload accepted      | Not established. Remote CPU, traffic/connection capacity, quota consumption, latency, retention, RPO/RTO and recovery timing require account/workload evidence. |

## Full user flow

The portfolio visitor loads the Vue page, reads published D1 content and uploaded
assets, submits an inquiry or question to its own Worker, and receives persisted
responses. An authenticated owner manages the CMS and responds to visitor/client
chat through the same deployment.

| Boundary         | Local evidence                                                                                                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| UI renders       | Desktop 1440×1000 and mobile 390×844 screenshots; restored portrait and live viewer indicator render; no horizontal overflow.                                                        |
| UI → API         | Actual inquiry, chatbot and login forms submit successfully; all 11 admin routes load with zero API failures.                                                                        |
| API → D1         | Inquiry and both chat turns counted in isolated D1; a CMS-created technology survives page reload.                                                                                   |
| Data → response  | Role/ownership, draft privacy, safe account projections, bound input validation and response envelopes exercised by integration checks.                                              |
| Response → UI    | Chat answer appears, inquiry succeeds, owner reaches dashboard, saved CMS row renders after reload.                                                                                  |
| Built deployment | Wrangler preview serves the actual compiled app against restored local data; 3 published projects and 3 project media reads succeed with no local HTTP errors or browser exceptions. |

Browser fixture evidence: `.test-artifacts/browser-f2637e3e-0135-4d72-b942-783ee52a25b0/`.
Built/restored preview evidence: `.test-artifacts/production-preview/`.
These local artifacts and database files are deliberately ignored by Git.

## Integration and security evidence

`npm test` passes three subscription tests and 79 isolated workerd/D1/DO checks:
owner/admin/client boundaries; public registration rejection; safe profiles;
last-owner protection; draft isolation; client request/chat ownership; private
notification isolation; initial authenticator enrollment, credential binding,
challenge single use and TOTP replay rejection; password changes and logout
revoking sessions and live sockets; atomic rollback on invalid relationships;
live visitor lookup, takeover/suppression and administrator reply delivery;
authenticated project room delivery; file signature/type checks, cross-chunk
range reads, upload roles and reference-protected media deletion; cross-origin
write rejection; idempotent public seeding and local chatbot fallback.

Strong PBKDF2-SHA256 (600,000 iterations) and QR generation run inside the Durable
Object. Opaque session hashes are stored in D1. Sessions and live authorization
recheck current user/account state. MFA secrets use AES-GCM; challenge claims
also bind to the current credential. Last-owner triggers and D1 batches preserve
database invariants independently of UI checks. Uploads are bounded and committed
atomically, with 512 KiB chunks and a 256 MiB media budget. Unused media cleanup
refuses any reference in content, galleries, avatars or chat history.

The complete npm audit reported zero known vulnerabilities after updating Zod
and aligning Miniflare with the patched Wrangler runtime. The final production
build succeeds. Rollup removes two misplaced PURE comments inside upstream Zod;
these are annotation warnings, not build failures.

## Recovery evidence

A repeatable-read, read-only PostgreSQL export captured all 20 source models.
`scripts/test-migration.mjs` rehearsed the prepared SQL in isolated D1 and verified
all table counts, foreign keys, every imported file's SHA-256 and reset flags.
The same SQL was applied locally; it was not applied remotely. One already-missing
thumbnail reference uses an available gallery image, recorded in the private
report. JSON site-content image lists were rewritten with their imported URLs.

The original Git bundle cloned successfully at the recorded source commit and
passed `git fsck --full` (an existing dangling commit is informational). Every
original environment/upload ZIP entry matched its recorded hash. The prepared
Cloudflare restore ZIP passed CRC checks; snapshot/archive SHA-256 values are in
the private backup manifest. Original source folders, including their local
configuration and dependencies, are preserved intact under the private backup's
`retired-source/` directory. No source folder was irreversibly deleted.

The backup is `BACKUPS/MY_PORTFOLIO-before-cloudflare-2026-11-05` in this workspace,
outside the repository. It contains private records/configuration and must never
be uploaded to public Git. It is on the same disk; independent-device recovery
has not been established.

## Remaining deployment/acceptance steps

Follow [Cloudflare setup and recovery](cloudflare-deployment.md). Replace the
placeholder D1 ID, apply remote schema/import, configure a unique runtime secret,
reset imported passwords, enroll authenticators and verify remote behavior before
traffic cutover. Legacy Argon2 accounts intentionally cannot sign in until reset.
The original PostgreSQL database remains available for rollback.

Core functionality was verified without external AI/email credentials. Live
OpenAI requests, Resend delivery, provider billing/limits and scheduled production
execution were not tested. Saved/queued email is distinguished from delivered
email. Free hosting does not include a promise of free optional provider usage.

Local tests do not measure the Free Worker's 10 ms CPU allowance or prove traffic
capacity. Observe production CPU, D1 read/write/storage quotas and Durable Object
requests/connections. Confirm retention, maintenance and backup objectives with
real workload evidence. No paid product was provisioned.

## Setup guide revision: 5 November 2026

PR #6 was confirmed merged into main at `2c28da4`. The expanded setup guide on
`docs/cloudflare-setup-guide` documents the existing Worker, production build
settings, D1 provisioning/configuration, rebuilding generated configuration,
runtime secrets, private remote import, owner reset, deployment and acceptance.
Preview bindings/secrets and staging data are explicitly separate from production.

Documentation checks passed for 38 local links/script references, code fences,
10 setup steps and required production/preview settings. The private archive's
structure and report matched the documented 15 import parts, 184 records and
14 media files/22,829,795 bytes. Installed Wrangler help confirmed migration,
export and Preview Base secret command syntax. Documentation formatting and
Git whitespace checks passed. No runtime code changed, so the earlier runtime
test evidence was not repeated or promoted to remote acceptance. No Cloudflare
login, provisioning, migration, secret update or deployment was performed by
this documentation revision.
