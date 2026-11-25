# Jhon's portfolio

One integrated Vue 3 + TypeScript application deployed to Cloudflare Workers
with D1 and a SQLite Durable Object. The public design, admin CMS, owner/admin/
client roles, authenticator login, project inquiries/chat, chatbot with live
takeover, photography, gears, certifications and portfolio game are retained.

There are no separately deployed client/server applications. Run commands at
the repository root; Vue lives in `src/`, HTTP/live backend code in `worker/`,
and database migrations in `migrations/`.

For the incomplete Cloudflare installation, start with the
[complete Cloudflare setup guide](docs/cloudflare-deployment.md). It separates
dashboard settings, PC commands, production restoration and first login.

The commands below are for a **fresh local database**, not production. On this
workstation the existing portfolio was already restored locally: reset the
existing owner's password with `npm run owner:create -- --reset` instead of
creating another owner, then enroll the authenticator on sign-in.

```sh
npm ci
npm run setup
npm run owner:create
npm run dev
```

```sh
npm test
npm run test:browser
npm run build
npm run deploy:check
```

See [local setup, Cloudflare deployment and data restoration](docs/cloudflare-deployment.md),
[architecture decisions](docs/cloudflare-unified-architecture.md), and
[verification evidence and release limits](docs/ENGINEERING_ACCEPTANCE.md).

Cloudflare account setup and a real D1 binding are still required before remote
deployment. Core hosting targets the Free plan. Optional AI and email providers
are separate integrations; the app works without their credentials. Private
records, secrets, uploads, local database state and backup archives stay out of Git.

Historical NestJS/Vercel documents are under `docs/legacy/`; the original source
is recoverable from Git and the private pre-conversion backup.

## Current public seed data

The existing `scripts/seed.mjs` command and all original `migration/*.mjs`
filenames are retained. The seeder now reads the CSV files in `migration/`,
captured read-only from the production public API at
`https://my-portfolio.itsajhon.workers.dev` on November 25, 2026 (Asia/Manila).

| CSV | Seed records |
| --- | ---: |
| `projects.csv` | 9 |
| `tech-stack.csv` | 24 |
| `experiences.csv` | 3 |
| `site-content.csv` | 38 |
| `chatbot-tags.csv` | 10 |
| `chatbot-knowledge.csv` | 13 |
| `project-media.csv` | 17 |
| `project-technologies.csv` | 10 |
| `certifications.csv` | 0 |
| `photography.csv` | 4 |
| `gears.csv` | 0 |

The empty CSVs retain their column headers because production exposes no records
for those sections. Production does not yet expose a shop API; no shop rows were
invented. The 13 enabled chatbot answers were read through a narrowly scoped,
read-only production D1 query because the knowledge-management API requires
administrator access. Disabled answers and visitor conversations were excluded.

The four owner-supplied photographs are additions to that production snapshot:
Sorsogon Capitol Park, Makati City, Sorsogon City, and Rompeolas in Sorsogon City,
in that order. Their published records, captions, accessible descriptions and
categories live in the existing `photography.csv`. The original JPEGs are
bundled under `public/seed/photography/` with their original filenames and bytes,
so they work in fresh installs without uploading media or creating an account.
These deliberately supplied seed assets are distinct from runtime upload files
and backups, which remain ignored.

Three personal projects were added from their public repository documentation
on November 25, 2026: [FableSplice Studio](https://github.com/Ajhon10/FableSplice),
[MemeCam](https://github.com/Ajhon10/meme-camera), and
[MuniAlert](https://github.com/Ajhon10/MuniAlert). They include summaries, scoped
features, platform/development status and repository links. FableSplice remains
labelled a Phase 0 prototype. Ten project/technology links reuse existing skill
records without changing proficiency ratings. Project media now includes the
original MemeCam studio screenshot and MuniAlert's desktop/mobile demo captures.
FableSplice uses an authored SVG prototype cover illustrating its actual pipeline,
not an application screenshot. These assets live under `public/seed/projects/`.
No live URLs were invented. The seed now contains 128 records overall.

CSV fields support quoted multiline text, commas, quotes, UTF-8 and `\N` for
database null (distinct from an empty string). Uploaded-asset references use
absolute URLs to the existing production files; binary uploads are not copied
into Git or recreated in D1. This is a public-content bootstrap, not a full
database/media backup. The seeded particle portrait has a byte-identical bundled
copy under `public/seed/portrait/`; the canvas maps only that exact production
URL to the same-origin copy, restoring local particle rendering and hover.
Other external portraits need their asset origin's CORS permission for canvas
reads; a static fallback remains available when those permissions are absent.
Account credentials, inquiries, private
chat and notifications are excluded.

The header uses an accessible sun/moon button for Light/Dark mode. Light remains
the default; the icon rotates/fades while the theme colors change. Reduced motion
disables both animations. The button is visible beside Menu on mobile.

Run `npm.cmd run db:seed` after local migrations. Repeated seeding adds missing
content without overwriting customized records. Missing project covers are filled
from the seed; existing chosen covers and soft-deleted projects are preserved.
Gallery relationships resolve
projects by slug so existing local IDs remain valid. Updating the CSVs does not
modify production data or publish the site.

## Automatic checks and deployment

The existing connection is active: the latest `main` commit checked on
November 25, 2026 passed both Portfolio CI and Workers Builds. Push a feature
branch for verification; merge to `main` for automatic production deployment.
See [push-to-deploy settings and this release's database steps](docs/cloudflare-deployment.md#push-to-deploy-without-opening-cloudflare).

Every push runs **Portfolio CI** in GitHub Actions: locked dependency install,
Node/Worker tests, TypeScript checks, production build and a Cloudflare deployment
dry run. Pull requests targeting `main` run the same checks. No production
credentials are supplied to these checks.

Cloudflare Workers Builds is the production deployer connected to `main`.
Merging a passing PR updates `main` and starts its automatic build and deployment.
`npm run build` includes the regression tests, so the Cloudflare build also stops
before deployment if tests fail. Check both **Portfolio CI** and **Workers Builds:
my-portfolio**; a source push alone does not establish a successful deployment.
See [the deployment guide](docs/cloudflare-deployment.md#automatic-checks-and-production-deployments).

PR branches use Cloudflare Worker Previews with a separate `portfolio-preview`
database, separate authentication secret and isolated Durable Object namespaces.
All previews share that staging database; production accounts and media are not
copied into it. Apply new preview migrations with `npm run db:migrate:preview`.
The Cloudflare Preview command is `npm run deploy:preview`, which runs the tests
and build before uploading. It also works locally after Cloudflare sign-in.

## Environment files

The active local environment file is `.dev.vars` in this repository root, with
the safe key template in `.dev.vars.example`. There is no active root `.env` in
the integrated Cloudflare application. Keep `.dev.vars` private and ignored by Git.

Production values are managed in Cloudflare Workers → my-portfolio → Settings →
Variables and Secrets, or with `npx.cmd wrangler secret put NAME`. Editing the
local file does not update production. The existing private bootstrap JSON is
`.wrangler/private/production-secrets.private.json`; do not recreate or rotate
AUTH_SECRET after authenticator enrollment.

The retired client/server `.env` files remain in the private backup at
`../../BACKUPS/MY_PORTFOLIO-before-cloudflare-2026-11-05/retired-source/`, inside
`portfolio-client/` and `portfolio-server/`. They belong to the old application,
not the current Worker. Never paste their contents into chat or commit them.
