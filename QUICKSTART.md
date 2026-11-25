# Quick start

The existing portfolio Worker and D1 are already deployed. Pushes to `main`
build and deploy automatically. Schema migrations and explicit account seeding
remain operator commands; see the [Cloudflare guide](docs/cloudflare-deployment.md).
Keep the current database IDs, runtime secrets and Worker connection.

Folder map: [project structure](docs/project-structure.md).
SQL: `database/migrations/`. CSV data: `database/seeders/data/`.
Account definitions: `database/seeders/data/users.csv`.

For **fresh local development only**, run from the repository root with Node
22.14+. On PowerShell use `npm.cmd` if npm's `.ps1` launcher is blocked. If using
this workstation's restored database, skip creating another owner and use
`npm run owner:create -- --reset` with the existing email instead.

```sh
npm ci
npm run setup
npm run owner:create
npm run dev
```

Choose a new password and enroll an authenticator on login. Keep `.dev.vars`
private. Local setup does not initialize or import the production database.

For existing local development, run `npm.cmd run db:migrate` before starting
new source. `npm.cmd run db:seed` adds public content. The separate
`npm.cmd run db:seed:users` adds missing accounts; it preserves existing ones.
To restore the requested legacy admin specifically, run
`npm.cmd run db:seed:users -- --restore-default-admin`. Add `--remote` only when
targeting the deployed database. Follow authenticator setup/verification and
replace the temporary password before accessing admin. See the
[database guide](database/README.md) for the user seed password settings.

The login page has Forgot password. Email recovery requires the existing mail
provider configuration; `.local` addresses need an owner/CLI reset instead.

[Cloudflare deployment and restoration instructions](docs/cloudflare-deployment.md)
include remote D1 setup, private data import and account provisioning.
