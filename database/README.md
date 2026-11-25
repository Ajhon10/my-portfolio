# Database files

| Folder | Purpose |
| --- | --- |
| `migrations/` | Ordered SQL schema/data migrations applied by Wrangler. Existing filenames remain unchanged so D1 history stays valid. |
| `seeders/data/` | Editable CSV seed data. Public page content and the explicit user definitions live here. |
| `seeders/users.mjs` | Separate account seeder. It hashes passwords and never runs from the public content seed or application startup. |
| `legacy/` | Preserved schema/import mapping, Prisma schema and historical seed source. The runtime also reuses `model-map.json`; these files are not active account seed data. |

Public content: `npm.cmd run db:seed` (add `-- --remote` for the deployed D1).
User definitions: `database/seeders/data/users.csv`.
User seeding: `npm.cmd run db:seed:users`. Existing accounts are preserved.
Only the specifically requested legacy admin can have its password restored:
`npm.cmd run db:seed:users -- --restore-default-admin`.
Add `--remote` to that command to operate on Cloudflare instead of local D1.

Each user's `passwordEnv` names a shell environment variable used for initial
creation. Real personal passwords do not belong in CSV. The requested
`admin@portfolio.local` bootstrap account has a built-in legacy default in
`users.mjs`; it must change its password after authenticator verification and
before receiving a full login session. The restore option preserves role,
profile, ownership and authenticator enrollment, and revokes old sessions and
recovery/setup challenges. It never promotes or revives a removed account.

Email recovery is available from `/forgot-password` when the existing Resend
configuration is present. `.local` addresses cannot receive email; their owner
can provide a temporary password through Admin → Users, or use the existing
`owner:create -- --reset` CLI. `/reset-password` consumes a one-use 15-minute
link. Resetting a password retains the account's authenticator requirement.
