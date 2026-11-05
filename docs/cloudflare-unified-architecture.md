# Unified Cloudflare portfolio

Decision date: November 5, 2026 (Asia/Manila).

## Confirmed choices

The owner requested one integrated application and Cloudflare-only frontend,
backend and database hosting. Laravel was initially requested, then superseded
by the owner's explicit choice of Vue + Cloudflare Workers + D1 after confirming
that the Cloudflare free plan is required. Keep the current Vue 3, TypeScript,
Pinia, Vue Router, Tailwind design and portfolio features.

Use one root npm package, Vite build and Worker deployment. Vue lives in src/;
the Worker API and its modules live in worker/. The browser uses same-origin
/api, /uploads and /socket paths. There is no independently deployed NestJS
server, PostgreSQL server, Redis service, PHP runtime or Laravel application.

## Cloudflare components

- Static Assets serves the compiled Vue interface.
- A TypeScript Worker validates HTTP requests, authorizes roles and accesses D1.
- D1 stores application records, revocable sessions, challenges and bounded media.
- A SQLite-backed Durable Object coordinates live presence/chat and performs
  expensive password operations outside the ordinary Free Worker's 10 ms CPU
  allowance. Keep strong password hashing; do not lower work factors for quotas.
- Uploads use bounded chunks in D1 by default so R2 billing activation is not a
  prerequisite. Preserve the current 8 MiB image / 12 MiB certificate limits,
  use atomic batches, and enforce a media budget below the free database limit.
  This is suitable for a small portfolio, not a large media library. R2 is a
  separate future opt-in, never automatically provisioned.

Existing public paths, CMS, owner/admin/client authorization, 2FA, client
requests/chat, chatbot fallback, media, photography, gears and game scores must
be preserved. Replace Socket.IO with the Worker's native WebSocket protocol and
a browser adapter rather than retaining a Node WebSocket server.

## Data and recovery

The pre-migration source bundle and verified private environment/upload ZIP are
in BACKUPS/MY_PORTFOLIO-before-cloudflare-2026-11-05 outside this repository.
The initial source/environment backup was subsequently expanded with a
read-only PostgreSQL snapshot and prepared D1 recovery archive. Its 184 records
and 14 referenced media files were restored locally and verified. This does
not establish a remote import; follow cloudflare-deployment.md for the explicit
production procedure. Never point local tests at production or copy private
records/secrets into Git.

Preserve IDs, dates, soft deletes, relationships, published status and media
URLs during import. PostgreSQL UUID defaults/enums become application-created
UUIDs and checked SQLite values. Interactive transactions become explicit
atomic D1 batches. Invalid relationships must roll back the complete batch.

No default public administrator password. Owner provisioning is an explicit
operator command. Sessions must recheck live user/account state and be revoked
on credential/role changes. 2FA setup challenges are short-lived, attempt-bound
and single-use; secrets are encrypted. Legacy Argon2 credentials need a documented
secure migration/reset path; do not pretend native Node hashing runs in Workers.

## External features and release state

AI-provider calls and outbound email are optional integrations, not backend or
database hosts. Without credentials, the existing grounded local chatbot fallback
and persisted inquiries remain usable. Never claim delivery when email is absent.
Preserve durable email intent, retry limits and safe operator visibility.

Free service quotas are finite. Exceeding Free Workers/D1/DO quotas can stop
requests; a local test does not prove production workload capacity. No paid
plan, Containers, paid object storage or external database is provisioned.

Implementation, local verification, deployment and intended-workload acceptance
are separate states. Migration implementation and deployment evidence will be
recorded as work completes. User traffic, retention, RPO/RTO and Cloudflare-account
acceptance remain unmeasured; do not promise universal free capacity.

References: [Workers limits](https://developers.cloudflare.com/workers/platform/limits/),
[D1 limits](https://developers.cloudflare.com/d1/platform/limits/),
[D1 batches](https://developers.cloudflare.com/d1/worker-api/d1-database/),
[Free SQLite Durable Objects](https://developers.cloudflare.com/durable-objects/platform/limits/),
[Vue on Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/vue/).

## Implementation evidence

Implemented locally on branch feat/cloudflare-unified. See ENGINEERING_ACCEPTANCE.md
for the completed API/browser/build/data-restore checks and the separate remote
deployment/workload acceptance steps. The retired source folders are retained
intact in the private backup rather than deleted.
