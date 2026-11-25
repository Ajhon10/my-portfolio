# Project folder audit and structure

Audited November 25, 2026. This is the integrated Vue/Workers application.

| Path | Responsibility |
| --- | --- |
| `src/components/` | Reusable UI and portfolio sections. |
| `src/views/` / `src/views/admin/` | Public/client screens and admin CMS screens. |
| `src/composables/provider/` | Same-origin API clients. |
| `src/stores/`, `src/router/`, `src/layout/`, `src/assets/`, `src/types/` | State, routes, layouts, styling and frontend types. |
| `worker/` | Hono APIs, authentication, Durable Object, mail and media services. |
| `shared/` | Logic shared by browser and Worker. |
| `database/migrations/` | Ordered D1 SQL files; existing basenames and contents retained. |
| `database/seeders/data/` | Public content CSVs and explicit user definitions. |
| `database/seeders/users.mjs` | Account seeder, independent of public content updates. |
| `database/legacy/` | Old Prisma/import mapping and archived seed source; not the active seeder. |
| `scripts/` | Existing command entry points, database helpers, checks and asset generators. |
| `scripts/legacy/` | PostgreSQL export/import/recovery tools for the retired application. |
| `tests/` | Isolated regression and security tests. |
| `public/seed/` | Versioned image/model previews referenced by seed CSVs. Public URLs stay stable. |
| `public/downloads/` | Versioned downloadable resume assets. |
| `docs/` | Current architecture, deployment, design and verification records. |
| `docs/legacy/` | Historical stack/retired-feature notes and development reference material. |
| `.github/` | CI workflow. |
| Root `AGENTS.md` / `CLAUDE.md` | Agent routing remains at supported entry points. |

Root framework/build configuration remains in place: package/lock files, Vite,
Wrangler, TypeScript, Tailwind, PostCSS, Node version and HTML entry point. Moving
these would add configuration indirection without making the application clearer.
The existing frontend/Worker grouping already separates responsibilities; it
was retained to avoid unnecessary import changes across working features.

Generated/private directories are not source folders: `node_modules/`, `dist/`,
`.wrangler/`, `.test-worker/`, `.test-artifacts/` and `.deploy-check/`. They stay
ignored and were not moved or deleted. `.git/` is repository history. `.dev.vars`
is local runtime configuration, not seed data and not checked into Git.

## Moves and compatibility

- `migrations/` → `database/migrations/`.
- `migration/*.csv` → `database/seeders/data/`.
- Remaining `migration/` mapping/source files → `database/legacy/`.
- `scripts/migration/` → `scripts/legacy/`.
- Retired YouTube notes and the loose development-notes text file → `docs/legacy/`.

Wrangler configurations, JSON imports, TypeScript includes, scripts, tests and
documentation references were updated. Existing seed filenames and npm command
names remain. `scripts/seed.mjs` is still the public seeder; SQL migration history
uses its original filenames, so moving the folder does not reapply migrations.
See [database guide](../database/README.md) for public/user seeding commands.
