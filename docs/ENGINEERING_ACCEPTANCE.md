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

The initial automatic checks for `ecd9936` passed both GitHub CI jobs. Cloudflare
Preview build `c2d1a11b-d5d6-414a-addc-f1c7efda94c1` still skipped its build command
and failed because `dist/client` did not exist. Production and Preview settings
are distinct; updating the production Build command did not populate the Preview
build step. Added `npm run deploy:preview` as the explicit Preview command. It
executes the tested build entry point before `wrangler preview`, covering that
hosted configuration gap without relying on cached build output.

The operator confirmed saving `npm run deploy:preview` as the separate Cloudflare
Preview command. A fresh push checks this saved configuration rather than relying
on a build that was already queued before the setting changed.

Build `7f196c1d-6ef4-4bd6-8381-d77fdf508f7f` still used the existing Preview's old
`npx wrangler preview` command. Cloudflare copies Base build settings to new
Previews; Base edits do not update existing Preview settings automatically.
The disposable PR runtime preview, originally created at 11:34 UTC, was removed
for recreation. Its deployment metadata was retained privately; the staging D1
database and production deployment were preserved. Cloudflare Builds retained
its separate branch build settings, so this did not resolve automatic builds.

Added a one-time masked-token setup command that updates production, Base and
existing Preview build commands through the documented Builds API. It verifies
the repository/branch before mutation, patches only command fields, saves a
private settings backup and reads back every affected Preview. Two isolated
tests pass for the update/cascade behavior, preservation of unrelated settings,
wrong-repository rejection and secret-free errors. Actual configuration and
automatic Preview acceptance still require the user-scoped Builds permission
that the workstation's Wrangler OAuth session does not provide.

## Primary / Secondary themes and shop — November 25, 2026

Implemented locally: white/blue Primary and navy Secondary themes, persistent
public/admin selectors, SVG logo/action icons, public shop, category/product
administration and multiple image/video uploads. The owner selected inquiry
plus optional external purchase links. See portfolio-redesign.md and
cloudflare-unified-architecture.md for the interaction/data contracts.

Final local verification passed:

- `npm.cmd run build`: 46 Node tests, 143 isolated Worker checks, all TypeScript
  checks and Worker/client production compilation.
- `npm.cmd run test:browser`: desktop/mobile public pages, all 12 CMS pages,
  theme persistence, SVG icon presence, navigation overflow checks at 768, 920,
  921 and 1024 pixels, multiple shop categories, draft privacy, three-file
  image/video selection, actual WebM playback, category/search filtering and
  inquiry prefill. No page errors or failed page API responses.
- Worker checks cover unauthorized/client mutations, invalid categories and
  atomic rollback, unsafe purchase URLs, published-only lists, media signature
  checks, gallery/file-reference limits, soft deletion, and 81-product pagination
  with filters applied before paging.
- `npm.cmd run deploy:check`: successful dry run; no publication.
- `git diff --check`: passed.

Reviewed the saved Primary/Secondary desktop and shop/mobile screenshots.
Final browser evidence is kept in the ignored directory
`.test-artifacts/browser-40c9ef50-e23c-47a8-96a5-b155d9f9d54f`.
Initial checks exposed Windows sandbox access restrictions, formatting-sensitive
Vue handlers and a browser assertion that needed to await server filtering;
the final runs above passed after those issues were resolved.

The configured local D1 target was verified to contain only migration/runtime
metadata before applying all seven schema migrations. No seeds, accounts or
remote data were changed. Previously restored local state under other database
identities was preserved. Before remote release, back up and apply
`0007_shop.sql` to the intended staging/production database, then deploy through
the existing release process. Remote deployment and workload acceptance remain
separate; this work did not publish, push or commit source changes.

## Production content CSVs, viewer controls and Light/Dark labels — November 25, 2026

Read current published portfolio data from the production public API and enabled
chatbot answers through one read-only D1 content query. Added 11 CSV files under
`migration/`, containing 107 records in total. Original seed filenames and the
`npm run db:seed` entry point remain unchanged. README.md records individual
counts and empty sections. Accounts, inquiries, conversations, notifications,
disabled answers and binary uploads were excluded. Production data was not
modified; no remote seed or deployment was run. All 23 referenced production
upload URLs passed HEAD checks. CSV media references point to those live assets.

The CSV reader preserves quoted multiline text, commas, quotes, UTF-8 and nullable
values. Isolated SQLite tests confirm complete page/gallery imports, foreign-key
integrity, idempotence, preservation of customized rows and parent-ID resolution.
The latest snapshot, including the enabled chatbot CSV, passed 48 Node tests and
143 isolated Worker checks with `npm.cmd test`.

Game mode moved from the header navigation to the hero's live viewer controls.
Five distinct visitor sessions display "You and 4 others are currently viewing";
two use singular "other"; one displays "You are currently viewing". The layout
owns game state, including Exit. Header theme labels are Light mode / Dark mode,
with Light default for new visitors and legacy dark defaults. New selector
choices persist. CSS transitions animate for 280 ms and respect reduced motion.
Linked portraits blocked from canvas by cross-origin restrictions remain visible
as static images with a matching preview caption.

Final local UI verification passed: `npm.cmd run typecheck`, production Vite
compilation, `npm.cmd run test:browser`, and `npm.cmd run deploy:check`.
Browser checks exercised fresh/legacy Light defaults, saved Dark choices,
reduced-motion behavior, a real CSS transition sampled at its midpoint, one/two/
five viewer sessions, game enable/disable, visible imported portrait, desktop/
mobile reflow, and the existing CMS/shop/inquiry/media flows. The animation test
samples the CSS animation directly to avoid a busy host missing a timed frame.
No page errors or failed page API responses were recorded. Reviewed rendered
desktop/mobile screenshots. Evidence:
`.test-artifacts/browser-ca9b2806-8b14-41d7-8ef1-58ae6d228b0f`.

`git diff --check` passed. Source remains local and uncommitted. The prior shop
migration's remote release requirement remains applicable; production deployment
and workload acceptance have not been performed as part of this update.

## Supplied photography seeds and animated sun/moon control — November 25, 2026

Added the four supplied JPEGs as deliberate source assets in
`public/seed/photography/`, preserving original filenames and SHA-256-matched
bytes. Added their published records to the existing `migration/photography.csv`
in the supplied order: Sorsogon Capitol Park; Makati City; Sorsogon City;
Rompeolas, Sorsogon City. Captions, accessible descriptions, categories and
display order are seeded and editable through Photography administration.
The seed now contains 111 records. The repeatable local seed command succeeded;
all four supplied IDs were verified as published and non-deleted locally.

The photograph API accepts only the bounded UUID/JPEG path shape under
`/seed/photography/` in addition to its existing media URLs. CMS edits of a seeded
photo succeed; client writes, traversal paths and unsupported asset extensions
are rejected. Runtime upload limits and permissions remain intact. Bundled
photos are served by Static Assets without creating upload or owner records.

`ThemeSelect.vue` keeps its filename and now renders a 44px sun/moon button with
accessible name, pressed state and action title. Rotation/fade accompanies the
existing color transition; reduced motion disables both. The public button is
visible beside Menu on mobile, with DOM order matching visual navigation order.
The four-photo gallery uses two columns on desktop and one on mobile.

Verification passed: 49 Node tests, 150 isolated Worker checks, TypeScript,
production compilation, complete browser flows and deployment dry run. Browser
checks cover the four loaded originals, filtering, native lightbox/Escape,
seed-photo CMS edits, real icon/color animation midpoints, reduced motion and
keyboard activation. Final built-Worker checks independently confirmed four
loaded photos, two/one columns at 1440/390px, no horizontal overflow after reflow,
and no page errors. Desktop/mobile screenshots were reviewed. Evidence:
`.test-artifacts/browser-99cf6a17-9f2a-4af1-8e18-23c7edfb450b`, including the
`photography-*-final.png` and theme-header captures.

`git diff --check` passed. Production was not changed or seeded, and this update
was not deployed, committed or pushed. Existing remote-release prerequisites
remain applicable.

## Connection feedback, header actions and back-to-top — November 25, 2026

Added a global connection bar with the requested offline/reconnected copy. It
starts quietly online, remains visible offline, dismisses recovery after four
seconds, cancels stale dismissal when connectivity changes again, and announces
updates accessibly. Moved Let's connect into the right-side controls beside the
sun/moon button, retaining an accessible icon-only contact action at 320px.
Near the page bottom, a back-to-top control sits above the chatbot launcher;
opening chat hides it to avoid overlap. Activation restores logo focus and
respects reduced motion.

The complete browser suite passed with no page errors or failed page API
responses. Checks include offline/online transitions, timer cancellation,
automatic recovery dismissal, 320/390px header reflow, chat collision avoidance,
back-to-top scrolling and focus, plus all existing CMS, shop, gallery, theme,
viewer and inquiry flows. Reviewed rendered mobile/desktop screenshots. Evidence:
`.test-artifacts/browser-1d7d5c8d-427f-473e-9758-7ad4bb1db68b/report.json`.
The final production build passed 49 Node tests, 150 isolated Worker checks,
TypeScript and Vite compilation; log: `.test-artifacts/final-build.log`.
`npm.cmd run deploy:check` also passed without deploying. The staged-file audit
found no private environment files, database artifacts or credential patterns.

Read-only GitHub verification confirmed both Portfolio CI and Workers Builds
succeeded for current main revision `e72a782`. The deployment guide now explains
the existing automatic main deployment and the shop migration-before-release /
public seed-after-assets sequence. No production database or build settings
were changed. Prepared the accumulated authorized changes on
`feat/portfolio-experience`, based on current `origin/main`, for the requested
GitHub push. No merge into main or production release is included.

## Personal repository project seeds — November 25, 2026

Added FableSplice Studio, MemeCam and MuniAlert to the existing `projects.csv`
after reading their public repository READMEs and relevant package metadata.
Entries include scoped descriptions, summaries, categories, repository URLs and
development/platform limits. FableSplice is explicitly a Phase 0 prototype.
Existing selected/featured projects and their content remain unchanged; the
new entries are published in the seed with subsequent display order. Ten
technology relationships reuse existing skill records in
`project-technologies.csv`, without inventing proficiency ratings. No public
live URL or screenshot was supplied by these repositories, so those fields
remain empty. Seed filenames are unchanged; total seed records are now 124.

The three existing public-seed tests passed. An independent in-memory import
and second seed confirmed nine projects, ten technology links, no duplicate
links and no foreign-key violations. Applied the repeatable seed locally only.
Focused browser checks passed for all three cards/detail views, their GitHub
links, expected technology associations and 1440/390px reflow, with no page
errors. Reviewed rendered desktop/mobile detail captures. Evidence:
`.test-artifacts/personal-projects/report.json` and adjacent screenshots.
This is a content-only update; runtime/schema code is unchanged. Production
seeding and release remain separate from the requested GitHub source push.

## Project images and local particle rendering — November 25, 2026

Added the original MemeCam studio screenshot from its local browser evidence
and MuniAlert's public November 24 desktop/mobile demo screenshots. The latter
contain fictional demonstration records. FableSplice has no published screenshot
or finished UI; its authored SVG cover labels the Phase 0 prototype and depicts
the documented story/media/render pipeline. Source assets are deliberately
bundled under `public/seed/projects/`; three thumbnail fields and four gallery
rows were added to the existing CSVs. Total seed records are now 128. Tall seed
screenshots preview from the top in cards/galleries; lightboxes show the original
complete images. No source screenshot bytes were edited.

Repeat seeding fills empty project covers while preserving chosen covers,
custom descriptions and deleted projects. Applied locally only. Existing seed
tests now cover those invariants. The project API accepts the three exact bundled
cover paths; isolated Worker checks confirm owner edits succeed, client edits
remain forbidden and traversal/unknown bundled paths are rejected.

The earlier cross-origin fallback hid the seeded portrait canvas locally because
the production image response does not grant local canvas pixel access. Bundled
the same original published portrait under `public/seed/portrait/` and map only
that exact immutable production URL to its same-origin copy in ParticlePortrait.
No rendering/sampling/scatter parameters or physics changed. Custom portraits
keep their normal URL and the existing static fallback when canvas reads fail.

Verification passed: 49 Node tests, 154 isolated Worker checks, types, production
build, deployment dry run and full browser suite. Browser assertions now require
a nonempty canvas, actual hover pixel changes with motion enabled, and stable
pixels under reduced motion. All previous admin, media, shop, viewer, theme and
inquiry flows passed with no page errors/API failures. Evidence:
`.test-artifacts/browser-55dae161-7165-4959-8d90-e73a5a704c6a` and
`.test-artifacts/project-media-build.log`.

Focused desktop/mobile checks verified all three loaded covers, four loaded
gallery images, Escape-dismissed lightboxes and the real local portrait canvas;
rendered captures were reviewed. Evidence:
`.test-artifacts/project-media-portrait/report.json`. Final built-Worker checks
also passed at 1440/390px after the thumbnail adjustment: 256px top-cropped
previews, complete mobile screenshot in its lightbox, nonempty particle canvas,
and no overflow or page errors. Evidence in the same folder: `built-report.json`
and `munialert-gallery-final-*.png`. No production migration,
seeding or release was performed; the source push continues the existing
authorized feature-branch workflow.

## Portrait visibility and shop subcategories — November 25, 2026

The particle portrait now emphasizes dark image features in light mode, with
larger/heavier blue glyphs and a stronger opacity curve. Dark mode uses light
features. A theme-attribute observer redraws even when reduced motion stops the
animation loop. Sampling positions and pointer-scatter physics are unchanged.
Reviewed light/dark captures at 1440/390px and verified actual canvas changes
when toggling themes. Evidence: `.test-artifacts/portrait-contrast/report.json`
and its adjacent image captures.

Added `0008_shop_subcategories.sql` without rebuilding existing catalog tables.
Subcategories belong to one category, allow the same name under different
parents and retain their parent after creation. Product fields, root assignments
and child assignments commit atomically. API and database guards reject
mismatched/inactive children, removal of required parent links and deletion of
categories/children still in use. Public child filtering/search runs before
pagination. Admin has creation/rename/removal, grouped checkboxes with automatic
parent selection, and full category-path labels. Public parent changes reset the
child filter. New CSVs seed Digital products → Kids and Clothing → Men/Women/Kids;
original seeder filenames and customized records remain. Total seed rows: 134.

Applied migration and seeds locally only. Verification passed: 50 Node tests,
185 isolated Worker checks, TypeScript, production compilation and deployment
dry run. Coverage includes migration over existing catalog rows, natural-key
parent resolution, repeat seeding, duplicate names scoped to parent, authorization,
immutable parents, invalid-assignment rollback, parent/child deletion guards,
draft privacy and independent filters for both Kids groups. Build evidence:
`.test-artifacts/subcategories-build.log` and `subcategories-final-compile.log`.

The deployment guide now requires all pending migrations, including 0007/0008,
before releasing the updated Worker, followed by the reviewed seed step. No
remote migrations, seeding, merge or production deployment were performed.

The final complete browser run passed with no page errors or failed page API
responses. It covers category/child creation and rename, automatic parent
selection, child clearing when a parent is unchecked, saved assignments, separate
Kids filters under different parents, reset on parent changes, mobile filtering,
and the existing gallery, inquiry, theme, presence and CMS flows. The parent
selector now has an explicit accessible name. The inquiry regression targets its
intended product after adding a second published test item. Mobile screenshots
wait for the normal sidebar closing animation and dismiss temporary success
notifications before showing the editor. Reviewed the resulting desktop/mobile
screens. Evidence:
`.test-artifacts/browser-9d5fe2b0-7be3-4ae2-aef8-813a17ba83ba/report.json`,
`admin-shop-subcategories-mobile.png`, `admin-shop-categories-mobile.png`, and
the shop/portrait captures. `git diff --check` and the source-file credential /
private-artifact audit passed before the authorized feature-branch push.

Final visual refinement stacks category-creation fields and their action on
phones, keeping parent names fully readable. Browser checks require the 390px
parent selector to exceed 240px in width and exercise changing its parent choice.
Production assets were rebuilt and the deployment dry run passed again after
this observed layout fix.

Final subcategory-only browser evidence, including the readable stacked mobile
form: `.test-artifacts/browser-04d3074f-8822-4a46-a114-bbdb4b15b37f`.

## Free resume shop item — November 25, 2026

Added one published Free item under Digital products → Resume templates, with
an original SVG preview and public download ZIP. The package includes an editable
DOCX, a matching TXT copy and customization instructions. Ordinary single-column
paragraphs, Arial 11pt body text, standard headings and main-body contact details
follow the cited university formatting guidance in README and the instructions.
The DOCX contains no tables, graphics, text boxes or header/footer references.
No actual applicant information or fabricated work history is included.

`scripts/generate-resume-template.py` reproduces the four bundled download assets
with Python's standard library; application builds/runtime still require only
the existing Node/Cloudflare stack. ZIP integrity and XML well-formedness passed
independent Python checks. A Node test decompresses both archives, verifies all
package contents, compares DOCX text in reading order to TXT and checks the
single-column / no-embedded-graphics structure. This verifies document structure
and extraction; it does not certify every third-party ATS parser.

Migration `0009_shop_downloads.sql` adds an optional download link without
changing existing product data. API validation allows HTTP(S) or the exact
bundled ZIP path, rejects executable protocols and traversal, and retains admin
authorization. New CSVs seed the product, scoped category associations and preview
without overwriting existing products. Total: 138 CSV rows. Applied migrations
and repeatable seeds locally only; production requires pending migrations before
deployment and the reviewed seed step after bundled assets are live.

Final verification passed: 51 Node tests, 190 isolated Worker checks, TypeScript,
production build and the full browser suite. Pagination regression now filters
its 81-item category fixture instead of assuming the seeded catalog is empty.
The free-item assertion searches before pagination. A fresh browser context
without credentials downloads the ZIP from the public shop and checks its
filename and exact bytes against the bundled source. Existing category, mobile
editor, portrait, inquiry, gallery, theme and CMS flows remain green. Reviewed
the actual free product card. Evidence: `.test-artifacts/free-resume-build.log`,
`.test-artifacts/free-resume-browser.log`, and
`.test-artifacts/browser-e531a2db-4952-4d14-ab4b-f3b3c94df90b`, including
`free-resume.png` and the private test-only downloaded ZIP. No live data or
production deployment was changed.

The final deployment dry run and source/private-artifact audit also passed.

## Production rollout and missing-content seed — November 25, 2026

User explicitly authorized updating the deployed website, adding local content
missing from production and pushing GitHub. Production was still at schema 0006;
its deployed shop API returned 500 because the shop tables had not been applied.
Recorded a current Cloudflare D1 Time Travel bookmark in ignored private release
metadata. No full private database export was downloaded. Applied the tested,
additive 0007, 0008 and 0009 migrations successfully.

Fetched main at `8b4715e` (PR #9, through `f1ecd20`), merged its history into the
feature branch and verified that the resulting `06f0312` source tree exactly
matched tested application revision `40b75b2`. Pushed it to GitHub main and the
feature branch. Both [Portfolio CI](https://github.com/Ajhon10/my-portfolio/actions/runs/45561501539)
and [Cloudflare Workers Builds](https://github.com/Ajhon10/my-portfolio/runs/139027033454)
passed. Confirmed the new live API and an exact-byte matching resume ZIP before
running `npm.cmd run db:seed -- --remote` successfully.

Read-only public-content hashes verified all 107 previously active public rows
remained unchanged. Public projects increased 6→9, photographs 0→4, project media
13→17 and public project/technology links 0→10. Production now has two shop
categories, five subcategories and one published Free resume template with its
preview. Site content, technology, experience and enabled chatbot content stayed
unchanged. Existing additional/removed production rows were preserved; the seed
does not copy local accounts, inquiries or conversations. Foreign-key check
returned zero violations and migration history includes 0001–0009.

Live read-only browser checks passed at 1440px and 390px: nine project cards,
all three new project galleries, four loaded photographs, the real particle
canvas, scoped Kids/Resume templates filters and a guest ZIP download matching
the bundled file exactly. No inquiries, account changes or test chat messages
were submitted to production. No page errors or failed page API responses were
recorded; rendered screenshots were reviewed. Evidence:
`.test-artifacts/production-release-20261125/report.json` and adjacent captures.
Public-row hash comparisons and recovery metadata remain under ignored
`.wrangler/private/`, without private database payloads. This establishes the
observed live flows; traffic capacity and optional email/AI delivery remain
separate acceptance questions.

## Admin home visual and catalog presentation — November 25, 2026

The owner selected a sample figurine referencing the existing portrait. Added
original reproducible GLB geometry and a pinned, lazy `@google/model-viewer`
viewer. Admin controls particles/portrait/model and the replacement GLB URL;
visitor visual controls and their local-storage override are removed. A CMS
save-response mismatch discovered by the new browser checks is fixed: upsert
now returns the actual stored row using SQL RETURNING, including its original
ID, rather than a confirmation envelope that broke subsequent editor rendering.

Implemented the requested DEOS/PDEA/OADR-only featured curation, Web Application
category and separate WWC employment attribution in migration 0011 and the
existing CSV. Company is editable and appears on cards/details. Light-mode
thumbnail labels now have white text on a dark background. Back-to-top appears
after 320 px; footer reveal observation and final spacing were corrected.
Shop uses compact cards and dedicated product details. Zero sales/no ratings
are explicit; owner-maintained verified totals are validated server-side and
constrained in SQL. No automatic checkout/review collection is implied.

Local verification: `npm.cmd run build` passed 53 Node tests, 205 Worker checks,
typechecks and Vite production builds. `npm.cmd run test:browser` passed all
existing flows plus real GLB loads in admin/public at 1440/390px, all three
persisted admin modes, disabled Save after success, removal of visitor controls,
compact shop cards, detail media/playback/inquiry, guest resume download, an
earlier back-to-top trigger and the normal-motion Shop→Home footer regression.
No page errors or unexpected API failures remained. Screenshots of the actual
figurine, shop and footer were reviewed. The new migration test verifies that
curation preserves descriptions, covers and publication flags.

Evidence: `.test-artifacts/presentation-build.log`,
`.test-artifacts/presentation-browser.log` and
`.test-artifacts/browser-42e5a6cc-ce85-4d51-9be0-20fd7d096ef4/report.json`.
Deployment dry run passed. Local migrations/seeds were applied. Recorded a fresh
production D1 Time Travel bookmark and public-row hash baseline under ignored
`.wrangler/private/presentation-*` metadata, without private database export.
Production migrations 0010/0011 were applied successfully before the code push.
Production seeding/deployment must additionally be confirmed against the exact
GitHub commit; source push and local tests alone do not establish a live rollout.
