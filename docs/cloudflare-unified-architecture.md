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
  Password PBKDF2 uses the portable `@noble/hashes` implementation at 600,000
  SHA-256 iterations. Cloudflare's production native PBKDF2 limit also applies
  inside Durable Objects; local Web Crypto success does not establish support.
- Uploads use bounded chunks in D1 by default so R2 billing activation is not a
  prerequisite. Limits are 8 MiB/image, 12 MiB/certificate and 32 MiB/project
  video (MP4/WebM), with at most 50 gallery items per project and a shared
  256 MiB budget. The authenticated API streams uploads to the private Durable
  Object helper for parsing and incremental hashing. Metadata, chunks and gallery
  references commit in one atomic D1 batch. Images use 512 KiB chunks; videos
  use 1 MiB chunks so a complete 32 MiB video read stays within 50 D1 queries.
  Public media supports HEAD, ETag and byte ranges for playback and seeking.
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

## Shop catalog extension — November 25, 2026

Migration `0007_shop.sql` adds categories, soft-deleted products, a many-to-many
product/category relation and ordered media. `/api/shop` uses existing session
authentication, OWNER/ADMIN authorization, bounded Zod validation and response
envelopes. Public product lists always require published status; direct draft
reads require administration. Product fields and category associations commit
in one D1 batch. Database triggers reject links to removed categories and
uploads to removed/full product galleries, including competing writes.

Public/admin product lists return at most 80 records per page, ordered by display
order and ID. Page numbers are bounded to 1–10,000; public search (200 characters)
and category filters execute before pagination. Each page uses one product query
and two enrichment queries with at most 80 bound IDs. Category lists are bounded
to 200. Products support 1–10 categories and 50 media items each.

`POST /api/upload/shop-media/:productId` reuses the authorized Durable Object
upload pipeline: image/video signature checks, 8 MiB images, 32 MiB MP4/WebM,
bounded streaming, atomic file/chunks/gallery writes and the shared 256 MiB D1
budget. File deletion checks shop gallery references. Media remains public
assets as elsewhere in this app; draft visibility is a catalog rule, not private
file storage. No new service or paid storage is provisioned.

The selected sales flow is inquiry plus an optional external purchase link.
Inquiries persist through the existing client-request path and preserve its
email-delivery semantics. This extension does not accept payments.

### Shop subcategories

`0008_shop_subcategories.sql` adds a second level under each existing category
without rebuilding or renaming the original tables. Child names are unique
within their parent, allowing separate Kids groups under Digital products and
Clothing. Parent assignment is fixed after creation; names remain editable.
The seed adds the two requested root groups and four children from CSV, resolving
existing parent IDs by name and preserving customized or removed records.

`/api/shop/subcategories` exposes active children of active parents (up to 1,000).
OWNER/ADMIN can create, rename and remove them. Products accept 0–10 child IDs
in addition to 1–10 categories; each child's parent must also be assigned.
Related product/category/subcategory changes commit in one D1 batch. Triggers
reject inactive or mismatched children and removal of required parent links;
atomic conditional deletes protect categories/children currently in use.
Categories with active children must have those children removed first.

Public search includes subcategory names. Parent and child filters run before
80-record pagination. A product page uses four queries (one page plus three
bounded enrichment queries), each binding at most 80 product IDs. The storefront
clears its child filter when changing parent and labels product category paths.
Admin child selection automatically includes the parent; deselecting a parent
clears its selected children. Migration and seeding are local until separately
released; apply pending schema migrations before deploying code that needs them.

### Free shop downloads

`0009_shop_downloads.sql` adds an optional public `download_url` field. Existing
products default to an empty link. OWNER/ADMIN can set an HTTP(S) link or the
exact bundled resume ZIP path; other relative paths and executable protocols
are rejected. The storefront shows a direct Free download action alongside the
existing inquiry flow. This link grants public file access, not paid delivery.

CSV seeds publish one free original resume template under Digital products →
Resume templates, with an SVG layout preview. Its Static Assets ZIP includes
editable DOCX, matching TXT and instructions; no account or inquiry is required.
These deliberately bundled assets use no D1 media budget. The generator uses
Python's standard library only and is not part of application build/runtime.
Seeded products, category links and gallery rows add missing records without
replacing customized rows. Parent/child IDs resolve from their scoped names.

## Bundled photography seeds — November 25, 2026

Four owner-supplied JPEGs are deliberate static source assets under
`public/seed/photography/`; metadata is seeded through `migration/photography.csv`.
They are independent of runtime `/uploads` and require neither a media-file owner
record nor D1 chunks. Photograph input validation permits their narrow UUID/JPEG
path shape so existing CMS editing works. They deploy with Static Assets and do
not change the D1 upload budget or its authorization/validation rules. No database
schema migration or new service is required for these four records.
