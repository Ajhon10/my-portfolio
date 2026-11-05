# Quick start

For Cloudflare, follow the [complete setup guide](docs/cloudflare-deployment.md)
from step 1. Keep the existing Worker, configure its root/main build settings,
create D1 and replace its ID, rebuild, prepare the private production secret,
migrate/import data and reset the owner, then deploy Worker code and secret
together. Publish the database configuration through a pull request afterward.
This first deployment enables runtime settings on an existing static-only Worker. Previews are configured separately after production works.

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

[Cloudflare deployment and restoration instructions](docs/cloudflare-deployment.md)
include remote D1 setup, private data import and account provisioning.
