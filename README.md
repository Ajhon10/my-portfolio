# Jhon's portfolio

Folder map: [project structure](docs/project-structure.md).
Database schema and seeds: [database guide](database/README.md).

Account definitions now live in `database/seeders/data/users.csv`; the account
seeder is `database/seeders/users.mjs`. Public content remains a separate
`npm.cmd run db:seed` operation. `npm.cmd run db:seed:users` adds missing users
without resetting existing passwords. Use `-- --restore-default-admin` only for
the explicitly requested `admin@portfolio.local` bootstrap restoration; add
`--remote` for Cloudflare. The temporary password requires authenticator setup/
verification and a new password before any full session is issued. Existing
owner accounts, profiles, roles and authenticator settings are preserved.

Forgot password is available at `/forgot-password`; one-use links expire after
15 minutes. Email recovery uses the existing `MAIL_API_TOKEN` and `MAIL_FROM`
configuration. Without those settings, the page directs users to the owner.
`.local` addresses need an owner-provided temporary password or a CLI reset.
Resetting a password revokes sessions and does not disable an authenticator.

One integrated Vue 3 + TypeScript application deployed to Cloudflare Workers
with D1 and a SQLite Durable Object. The public design, admin CMS, owner/admin/
client roles, authenticator login, project inquiries/chat, chatbot with live
takeover, photography, gears, certifications and portfolio game are retained.

There are no separately deployed client/server applications. Run commands at
the repository root; Vue lives in `src/`, HTTP/live backend code in `worker/`,
and database migrations in `database/migrations/`.

For local setup, deployment and recovery, start with the
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

The existing Cloudflare Worker and D1 binding are configured. Core hosting targets
the Free plan. Optional AI and email providers
are separate integrations; the app works without their credentials. Private
records, secrets, uploads, local database state and backup archives stay out of Git.

Historical NestJS/Vercel documents are under `docs/legacy/`; the original source
is recoverable from Git and the private pre-conversion backup.

## Current public seed data

The existing `scripts/seed.mjs` command and all original `database/legacy/*.mjs`
filenames are retained. The seeder now reads the CSV files in `database/seeders/data/`,
captured read-only from the production public API at
`https://my-portfolio.itsajhon.workers.dev` on November 25, 2026 (Asia/Manila).

| CSV | Seed records |
| --- | ---: |
| `projects.csv` | 9 |
| `tech-stack.csv` | 24 |
| `experiences.csv` | 3 |
| `site-content.csv` | 41 |
| `chatbot-tags.csv` | 10 |
| `chatbot-knowledge.csv` | 13 |
| `project-media.csv` | 17 |
| `project-technologies.csv` | 10 |
| `certifications.csv` | 0 |
| `photography.csv` | 4 |
| `gears.csv` | 0 |
| `shop-categories.csv` | 2 |
| `shop-subcategories.csv` | 5 |
| `shop-products.csv` | 4 |
| `shop-product-categories.csv` | 4 |
| `shop-product-media.csv` | 4 |

The empty CSVs retain their column headers because production exposes no records
for those sections. The production snapshot had no shop API. The shop CSVs now
seed the requested structure: Digital products → Kids and Clothing → Men,
Women, Kids, plus Digital products → Resume templates. Subcategory names are unique within their
parent, so both parents can have Kids. The 13 enabled chatbot answers were read through a narrowly scoped,
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
The seed contains 150 CSV rows overall. A shop
category-link row creates both its parent and optional child association.

Three draft printables are filed under Digital products → Kids. Their print files are in
`assets/digital-products/`. Admin → Shop → Edit product → Marketplace listings accepts
buyer-facing links for Raket.PH, Etsy, Teachers Pay Teachers, Payhip and Gumroad.
Each filled field adds a named purchase link to the product detail page after publication.

The shop includes one published **ATS-friendly Resume Template**, priced Free.
Its direct download contains an original editable DOCX, matching TXT and usage
instructions. The document uses a single column, Arial, standard headings and
ordinary paragraphs; contact information stays in the body. It contains no
tables, text boxes or images. Follow the employer's requested format and review
autofilled application fields. Sources for those layout choices:
[University of Minnesota Duluth](https://career.d.umn.edu/students/resume-cover-letter/applicant-tracking-system-ats-tips)
and [Dartmouth](https://careerdesign.dartmouth.edu/resources/beat-the-bots-understanding-applicant-tracking-systems/).
The original preview lives in `public/seed/shop/`; the four download assets are
deliberately bundled source files in `public/downloads/`. Rebuild them with
`python scripts/generate-resume-template.py` (standard library only, optional for
asset regeneration; Python is not required to build or serve the portfolio).
Direct free downloads require no account or inquiry. Existing purchase links and
inquiry flows remain available. The API permits the exact bundled ZIP path or an
HTTP(S) URL for a free download; paid-file access control is not implemented.

CSV fields support quoted multiline text, commas, quotes, UTF-8 and `\N` for
database null (distinct from an empty string). Uploaded-asset references use
absolute URLs to the existing production files; binary uploads are not copied
into Git or recreated in D1. This is a public-content bootstrap, not a full
database/media backup. The seeded particle portrait has a byte-identical bundled
copy under `public/seed/portrait/`; the canvas maps only that exact production
URL to the same-origin copy, restoring local particle rendering and hover.
Other external portraits need their asset origin's CORS permission for canvas
reads; a static fallback remains available when those permissions are absent.
Light mode uses dark image details as blue ink, heavier characters and reduced
background noise. Dark mode uses light details; changing themes repaints the
canvas immediately, including with reduced motion. Pointer scatter is retained.
Account credentials, inquiries, private
chat and notifications are excluded.

The header uses an accessible sun/moon button for Light/Dark mode. Light remains
the default; the icon rotates/fades while the theme colors change. Reduced motion
disables both animations. The button is visible beside Menu on mobile.

Run `npm.cmd run db:seed` after local migrations. Repeated seeding adds missing
content without overwriting customized records. Missing project covers are filled
from the seed; existing chosen covers and soft-deleted projects are preserved.
Migration 0011 performs the requested featured-project correction once; the CSV
also features only DEOS, PDEA and OADR, with Web Application classification and
WWC Yellow Bumblebee Corp. employment attribution. Migration 0010 adds the
company and shop sales/rating fields. The three new home-visual settings are
seeded without replacing an existing admin choice.
Gallery relationships resolve
projects by slug so existing local IDs remain valid. Updating the CSVs does not
modify production data or publish the site.

Admin → Dynamic Settings → Home page → Home visual selects particles,
portrait or the bundled sample 3D figurine. Save applies that choice for all
visitors. Model URL and description can be changed there, with a live preview.
The original sample references the existing portrait's hair, facial features
and white/red polo; its likeness is approximate. The viewer is installed and
loads only for 3D. See [visual setup and model tools](docs/portfolio-redesign.md).

Shop cards show title, image, price, sold count and ratings, linking to the full
description/gallery at `/shop/:id`. Admin → Shop accepts verified sales/rating
totals; zero sold and No ratings yet are the defaults. These totals are manually
maintained because the shop uses inquiries and optional external purchases.
Manage Shop categories and subcategories in Admin → Dynamic Settings. The
product editor uses dropdowns to assign multiple categories and subcategories.

## Automatic checks and deployment

Production was updated and seeded on November 25, 2026 (Asia/Manila):
[live portfolio](https://my-portfolio.itsajhon.workers.dev) now has nine public
projects, four photographs and the free resume item. Migrations 0007–0009 are
applied. All 107 pre-existing active public records retained their exact values.
Live desktop/mobile checks passed for project images, particles, photography,
shop category filters and an anonymous resume download with matching file bytes.
See [production release evidence](docs/ENGINEERING_ACCEPTANCE.md).

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
