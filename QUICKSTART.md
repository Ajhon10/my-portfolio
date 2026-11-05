# Quick start

Run commands from the repository root with Node 22.14+:

```sh
npm ci
npm run setup
npm run owner:create
npm run dev
```

For this workstation's restored database, use `npm run owner:create -- --reset`
with the existing owner email instead of creating another account. Choose a new
password and enroll an authenticator on login. Keep `.dev.vars` private.

[Cloudflare deployment and restoration instructions](docs/cloudflare-deployment.md)
include remote D1 setup, private data import and account provisioning.
