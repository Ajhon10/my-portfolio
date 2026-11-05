# Unified portfolio verification

Recorded 5 November 2026. Branch: `feat/cloudflare-unified`. Original source
commit: `f0af8e64d204031748b6293083e2166ada341049`.

## Release state

| State                  | Evidence                                                                                                                                                                   |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Implemented            | One Vue/Workers root package, same-origin API/uploads/WebSocket, D1 SQL schema and SQLite Durable Object. Original Vue design and CMS/client features retained.            |
| Locally verified       | TypeScript checks, build, 43 Node tests, 85 Worker integration checks, browser login/admin/Gears/Photography/reply flows and production deployment dry run passed.         |
| Data restored locally  | 184 PostgreSQL records across 20 models and 14 media files restored to local D1. Original PostgreSQL was read only.                                                        |
| Deploy package checked | Wrangler dry run: 405.32 KiB raw, 89.82 KiB gzip; D1, SQLite DO and Assets bindings only.                                                                                  |
| Deployed               | Admin mail-status repair deployed as `b06192c8-1c4d-4735-af54-4f2a0c74f0c7`; public/API health, assets and access guards verified. Automated email setup is still pending. |
| Workload accepted      | Not established. Remote CPU, traffic/connection capacity, quota consumption, latency, retention, RPO/RTO and recovery timing require account/workload evidence.            |

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

## Static-only Worker setup correction: 5 November 2026

The owner's dashboard showed that runtime secrets and bindings cannot be added
to its current static-assets-only deployment. The setup order now prepares a
private JSON secret file and uploads it together with the first full Worker code
using wrangler deploy --secrets-file. Dashboard runtime settings become available
after a successful script-backed deployment; future Git builds retain secrets.
No application source or production resource was changed for this correction.

The correction was prepared in a separate worktree to preserve the owner's
uncommitted real D1 ID on setup/cloudflare-production. Documentation validation
checks local links, package/script references, code fences and bootstrap command
syntax. Installed Wrangler help confirms --secrets-file support and preservation
of existing secrets. No authenticated deployment was performed or claimed.

## D1 import parser repair and remote recovery: 5 November 2026

The records SQL file committed, but Wrangler printed upload progress before its
JSON response. Parsing all stdout as JSON failed, leaving 184 records and no
media. The wrapper now frames and validates D1 JSON independently of progress,
preserves UTF-8, rejects failed/truncated/ambiguous results and saves raw failure
output privately.

Verified --resume replays trusted recovery SQL in memory, compares all original
record fields and exact media chunks against D1, skips completed parts and
applies only missing ones. Mismatched records, unknown media and incomplete
files stop recovery without deletion or overwrite. Fifteen targeted tests passed
for framing/progress/failure handling, new imports, populated-target refusal,
lost responses after commit, repeat resume, changed records and incomplete media.

The local setup branch received the repair without changing its uncommitted D1
configuration. All 20 remote record tables matched and their part was skipped;
14 missing media parts were imported and verified byte-for-byte. Final remote
audit: 184 records, 14 media files, 22,829,795 bytes, no foreign-key violations.
Private evidence: .wrangler/private/import-recovery-2026-11-05.private.json.

This verifies remote database restoration, not application deployment or traffic
capacity. One imported owner still requires password reset. The full Worker and
secret deployment remains a separate setup step.

## Owner password prompt repair: 5 November 2026

The former CLI closed its email reader and opened a second invisible password
reader. The helper now keeps one input reader, renders asterisks for the password,
asks for confirmation and disables readline history. It restores terminal mode
on completion/cancellation, rejects interactive secret entry on a non-terminal,
and preserves the existing environment-variable automation path. Password
validation, PBKDF2 work factor and account/session database operations are unchanged.

Seven targeted input tests passed: email-to-password transition, masking,
backspace, confirmation mismatch, cancellation, history isolation, automation
and noninteractive failure behavior. A Windows PowerShell PTY probe completed
email, masked password and confirmation using fake credentials and exited
successfully without accessing a database. No real owner password was entered,
displayed, reset or recorded by this repair. The owner's uncommitted D1 ID is
preserved when applying the fix to the local setup branch.

## Owner reset validation and D1 diagnostics: 5 November 2026

An 11-character entry hit the existing 12-character minimum. A later valid-length
entry reached the read-only account lookup, where Cloudflare returned API error 7403. The wrapper had hidden that authorization failure behind an ambiguous-write
warning. The remote lookup now succeeds with the current OAuth login, account
cache and database binding; the earlier provider failure was not reproduced.
Read-only inspection also found that the supplied login address did not match
the imported owner. No production password or account identity was changed.

The CLI now validates individual fields, retries invalid-length interactive
passwords before confirmation, and checks database/account access before password
entry on resets. Known 7403 failures explain account/D1 authentication checks;
read failures state that no changes were requested. Failed or lost write responses
retain the uncertain-commit warning and are never automatically retried. The
existing PBKDF2-SHA256 work factor, reset SQL and session/challenge revocation
remain intact. Errors exit cleanly without a Node stack trace.

Verification: 34 Node tests and 79 isolated Worker/D1/Durable Object checks passed
with `npm test`. New coverage exercises length boundaries, symbols/spaces,
masked retries, field-specific errors, failed preflight before password entry,
authorization diagnostics, missing accounts, full CLI reset/hash verification,
account-scoped revocation and a lost write response without a retry. CLI tests use
an isolated SQLite database and Wrangler stand-in, with no production writes.
The initial sandbox run passed all Node tests but esbuild could not read a Windows
parent directory; the same complete suite passed outside that restriction.

Release state: implemented and locally verified. Remote database access was
verified read-only. The real password must be entered privately by the operator;
no application deployment or intended-workload acceptance is claimed.

## Authorized owner login correction: 5 November 2026

After explicit operator approval, the existing remote owner's login address was
updated to the requested address. Read-back verified the same auth/user IDs and
OWNER role, an unchanged password and reset-required flag, and revoked sessions
and authentication challenges. No second account was created. Private evidence
is under `.wrangler/private/owner-email-change-*.private.json`; personal addresses
and password hashes are excluded from this shared record. The real password
still needs the interactive reset command. This verifies the remote identity
change, not application deployment or workload acceptance.

## Owner password minimum: 5 November 2026

At the owner's request, the CLI minimum is now 8 characters, matching the existing
Worker and profile password validation. The 128-character maximum and password
hashing work factor are unchanged. Prompts and deployment instructions now show
8-128 characters. All 14 owner prompt/command tests passed, including rejection
of 7 characters, acceptance of exactly 8, and a complete isolated reset with an
8-character password. This is locally verified; no real password was changed.

## Production password verification repair: 5 November 2026

Live login returned HTTP 500. A single diagnostic request with a random incorrect
password reproduced it; the Durable Object tail reported `NotSupportedError`
because native PBKDF2 rejected 600,000 iterations above its production limit of
100,000. Database health and all five remote migrations were verified separately.
Private trace: `.wrangler/private/login-tail.private.json`.

Password derivation now uses locked `@noble/hashes` 2.4.0 in PortfolioHub, retaining
PBKDF2-SHA256, 600,000 iterations, the existing salt/digest format, bounded verifier
work factors and constant-time HMAC verification. Existing CLI-reset passwords
remain compatible. No real password or MFA secret was read or changed.

Verification: 38 Node tests and 79 isolated Worker integration checks passed,
including a simulated production native-PBKDF2 cap, exact interoperability with
Node-generated hashes, wrong-password rejection, Unicode passwords and work-factor
bounds. Type checking, production build and deployment dry run passed. The complete
dependency audit reported zero known vulnerabilities. Browser verification and
remote deployment evidence are recorded below.

Browser verification passed for public desktop/mobile, chat, inquiry, owner
bootstrap/login, 11 admin pages and CMS persistence, using isolated local data.
Evidence: `.test-artifacts/browser-abd2bf99-3083-447c-ab03-af8854ec9846`.

The tested artifact was deployed to the existing Worker as version
`5d044d63-f6ce-4a76-8e6c-b723467c5d88`, preserving runtime variables and existing
secrets. No production database records, password or MFA configuration were
changed by the repair. The same diagnostic incorrect-password request now
returns HTTP 401; health returns HTTP 200. Live tail confirms password
verification completed in PortfolioHub without an exception (2,644 ms CPU for
this single probe). This sample does not establish traffic capacity. The owner's
correct-password login and authenticator enrollment still require private user
verification; the diagnostic did not use or collect the real password.

Private release record (previous version, artifact SHA-256 and remote result):
`.wrangler/private/password-fix-release.private.json`. Post-deployment trace:
`.wrangler/private/login-after-fix-tail.private.json`.

References: [Cloudflare runtime limitation](https://github.com/cloudflare/workerd/issues/1346),
[portable PBKDF2 API](https://github.com/paulmillr/noble-hashes#pbkdf2).

## Admin navigation and reply-email visibility: 5 November 2026

The operator reported console errors on Gears/Photography and a client not
receiving a reply email. Clean-browser checks reproduced neither navigation nor
form failures: sidebar transitions, image uploads, record saves and reloads pass
on both pages, with no application page errors or failed API responses. The
screenshot includes earlier login failures and message-channel errors; their
source cannot be established from the screenshot alone. No extension-error
suppression was added to application code.

Client Requests previously promised that a reply would be emailed even when
email sending was unconfigured. The page now shows configuration availability,
saved/queued/failed/provider-accepted status, and an inline save result. New
reply/outbox rows share an identifier for durable status lookup; older replies
show unknown status. The status endpoint is restricted to administrators and
returns configuration presence and aggregate counts without secret values or
client payloads. API acceptance is explicitly distinguished from inbox delivery.

Configured replies attempt only their newly queued email in background work;
scheduled retries remain available. Queue claims recheck due time and attempt
bounds to prevent competing/stale jobs from skipping backoff. Failure diagnostics
record only a provider HTTP status. The saved reply and outbox intent remain one
atomic D1 batch, and all previous data is preserved without a new migration.

Verification: 43 Node tests and 85 isolated Worker checks passed. Browser evidence
in `.test-artifacts/browser-9c9edf21-37f4-4ef7-b471-b4205c172fda` covers both reported
pages plus reply saving and email-status persistence. Mock-provider tests cover
missing configuration, targeted immediate sending, provider acceptance without
resending, backoff, terminal failures, stable idempotency keys and competing
claims. All email tests use fake data and send no real external messages.

Initial production checks were blocked by a signed-out Cloudflare CLI session.
OAuth authorization was restored through the browser. Inspection of active
binding names confirmed that MAIL_API_TOKEN, MAIL_FROM and MAIL_TO are absent.
One email is pending with zero attempts or provider acceptances. Both gear and
photograph tables contain zero active records; their empty Add forms are expected.
No client message content or secret values were displayed during diagnosis.

The tested build was deployed to the existing Worker as version
`b06192c8-1c4d-4735-af54-4f2a0c74f0c7`, preserving runtime settings and the pending
queue. Live health, public gears/photography APIs and the new admin bundle return
HTTP 200. The email-status endpoint rejects unauthenticated callers with HTTP 401.
Read-back confirmed the single email still pending with zero attempts; no real
external email was sent by this work. Private configuration evidence and release
verification are in `.wrangler/private/admin-mail-status.private.json` and
`.wrangler/private/admin-mail-release.private.json`.

Implementation, local verification and deployment are complete. Actual email
delivery remains unconfigured and unverified. The operator is unsure whether a
sender domain is owned; no domain, provider account or paid service was provisioned.
Provider setup is documented in the deployment guide, including the restriction
that Resend's default test sender cannot email arbitrary clients. Intended-workload
acceptance remains separate from these targeted checks.

## Project catalog additions and environment-file guidance: 5 November 2026

Added SSS Archive v2, Kiko's Order Planner and Blank as published, featured
projects after the existing three public entries. Public summaries and details
describe implemented features without publishing customer/financial records or
unverified hosting claims. SSS links to the public Ajhon10/SSS-archive-v2
repository, whose README and package manifest were reviewed. Kiko's and Blank
descriptions were checked against their local README and implementation records.
No public deployment URLs or private screenshots were invented for these apps.

The public seed catalog now includes the same additions. Isolated SQLite checks
validated all six seeds, field bounds and SQL escaping, repeated insertion without
duplicates, and preservation of customized existing descriptions. The production
write added exactly three project rows and preserved all four previous rows,
including the existing soft-deleted record. Public API read-back returned six
published projects. No Worker deployment or secret change was needed for this
database-content update. Private before/after evidence is under
`.wrangler/private/project-additions-*.private.json`.

Live browser verification passed for six cards, all three new project detail
views, desktop/mobile layout and no failed site responses or page errors. These
read-only checks submitted no forms. Evidence:
`.test-artifacts/public-projects-06f0e7b6-244c-496d-a09e-af71330291d8`.

README now identifies the active local `.dev.vars`, its safe example, production
Cloudflare settings and the retired client/server `.env` backup locations.
Environment secret values were neither displayed nor changed.

## Multiple project images and videos: 5 November 2026

Implemented mixed project galleries with multi-file selection, visible removal
controls, image cover selection and public MP4/WebM players without autoplay.
Images retain their enlarged view. Limits are 8 MiB/image, 32 MiB/video, 50 gallery
items/project and a shared 256 MiB budget. Legacy image-only API responses remain
available; the new media response identifies images and videos separately.

Upload authorization stays in the API. Multipart parsing and incremental SHA-256
hashing run through a private Durable Object binding, outside the ordinary Free
Worker CPU budget. Extension, MIME, signature, body size and gallery limits are
checked. Metadata, chunks and gallery references share one atomic D1 batch.
Videos use 1 MiB chunks; images retain 512 KiB chunks. Public responses preserve
HEAD, ETag, MIME and byte-range behavior, including cross-chunk video seeking.

Migration 0006 copies both media tables before replacing their parent/child
relationship. An isolated migration test checks exact legacy bytes, foreign
keys, deletion cascades, file bounds, the gallery limit and shared storage budget.
The production database was exported privately before migration. That export was
restored into isolated SQLite and all 14 media hashes verified. After remote
migration, all 14 original public downloads still matched their original SHA-256
hashes and metadata; foreign-key checks returned no violations.

Local verification passed: 44 Node tests, 102 Worker integration checks, all
TypeScript configurations, production build and deployment dry run. The browser
suite covered multi-image selection, cover selection, enlarged images, WebM and
the supplied 24,881,424-byte H.264/AAC Kiko's promo: upload, playback and seeking
to 40 seconds. It also rechecked owner login, 11 admin pages, Gears/Photography
uploads, saved reply status and persistence. Early generated-video fixture and
test-navigation failures were corrected before the final successful run.
Evidence: `.test-artifacts/browser-26050989-a5ca-4f76-8829-d7af6e5e6ca5`.

The tested build was deployed as Worker version
`55b59896-2f18-41f4-b7db-452f3d77e038`, preserving established runtime variables and
secrets. Nine images and the supplied promo were published to the live D1 media
store, with each downloaded asset hash verified against its source. Existing
DEOS/PDEA images were retained. New galleries use the OADR public logo, three
SSS screenshots extracted from its public user manual with training/example
data, three Kiko's promo stills with fictional demo data, and two Blank screenshots
generated by its end-to-end test fixtures. No private customer or personal
financial records were selected. Covers now resolve on all six public projects.

Live browser checks passed for all six covers, SSS/Kiko's/Blank galleries,
image decoding, mobile layout, actual promo playback and seeking, and an exact
cross-chunk HTTP 206 response. There were no application page errors or failed
site responses. Evidence:
`.test-artifacts/live-project-media-e1aabfe4-90b8-4091-91e9-063b4931f7c0`.
The 24 stored files total 52,491,178 bytes. A fresh private production export
includes the new assets. Release, publication and recovery records remain under
`.wrangler/private/project-media-*`; media and database backups are excluded
from Git. Source delivery is tracked separately by the Git commit and push.

Implementation, local checks, remote migration, deployment and targeted live
verification are complete. This is not a concurrent-user or sustained-bandwidth
acceptance test. Real client email delivery still requires provider configuration;
this release neither configures email nor sends test messages to clients.

## GitHub CI and Cloudflare Preview repair: 5 November 2026

The latest PR #8 Cloudflare check failed at `wrangler preview` because the root
configuration lacked a `previews` block. The supplied build log also showed
dependency installation followed directly by the Preview command, with no build
step. The operator confirmed saving `npm run build` as the Cloudflare build
command for production and previews. The existing integration deploys `main`
to production and other configured branches to Worker Previews.

Added Portfolio CI for every GitHub push and PR targeting `main`: locked npm
installation on Node 22, the complete test/type/build entry point, then a
Cloudflare deployment dry run. Actions are pinned to official release commits,
repository permissions are read-only and verification receives no production
credentials. `npm run build` now includes the tests, so the Cloudflare build also
stops on regression failures. Wrangler preserves dashboard variables.

Provisioned the separate Free D1 database `portfolio-preview`, applied all six
migrations and seeded only public portfolio content. The root `previews` block
binds that database, the required variables and PortfolioHub. Each Preview gets
an isolated Durable Object namespace; previews share the staging D1 database.
The dedicated migration config selects the same staging database. A generated
preview-only AUTH_SECRET was uploaded to Preview Base and stored in an ignored
private recovery file. Production accounts, records, media and secret values
were not copied into staging. No paid services or external emails were used.

Local verification passed: 44 Node tests, 102 isolated Worker checks, TypeScript,
production compilation and deployment dry run. A manual Preview deployment
`8a2c674f-8331-402f-8bb0-6cc409111831` succeeded at
`https://setup-cloudflare-production-my-portfolio.itsajhon.workers.dev`.
Live browser checks passed for health, six public projects, desktop/mobile
layout, WebSocket connection and grounded chat. No site responses failed and
no page errors occurred. Preview media is empty while production retains the
four-item Kiko's gallery, consistent with the separate database bindings.
Evidence: `.test-artifacts/cicd-preview-d3996a4e-5057-414b-9945-f4a6d1257e7b` and
`.wrangler/private/cicd-preview-verification.private.json`.

Automatic results are tracked by the latest PR commit's Portfolio CI and Workers
Builds checks, separately from this manual Preview verification. The source is
pushed to the PR branch; merging into `main` and accepting the resulting automatic
production deployment remain separate steps. Private CI release evidence is
kept in `.wrangler/private/cicd-release.private.json`. Capacity under sustained
user traffic remains unmeasured.
