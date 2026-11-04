# Deploy the portfolio frontend to Cloudflare

Last reviewed: 2026-10-31 (Asia/Manila)

This guide deploys the Vue/Vite frontend to **Cloudflare Workers Static
Assets**. Cloudflare currently recommends Workers Static Assets for new static
sites and single-page applications. Cloudflare Pages still works, but new
Cloudflare features and optimizations are focused on Workers.

Only the frontend moves to Cloudflare. The existing NestJS API remains on
Vercel, Render, or another Node-compatible host.

## What will be deployed where

| Project part | Deployment location |
| --- | --- |
| Vue 3 / Vite frontend | Cloudflare Workers Static Assets |
| NestJS / Prisma API | Existing Vercel, Render, or other Node host |
| PostgreSQL database | Managed database used by the API |
| Uploaded images and certificates | Durable Blob/object storage used by the API |
| Redis and Socket.IO coordination | Existing backend services |

Cloudflare will serve the files generated in `portfolio-client/client-dist`.
It will **not** run the `portfolio-server` application or migrate the database.

## Before you begin

You need:

- A Cloudflare account.
- The `MY_PORTFOLIO` repository pushed to GitHub or GitLab.
- Permission to connect that repository to Cloudflare.
- A deployed backend API with a public HTTPS address, such as
  `https://api.example.com`.
- Access to the backend host so you can update `APP_DOMAIN` after Cloudflare
  gives the frontend its URL.
- An active Cloudflare DNS zone only if you want to use a custom domain. The
  generated `workers.dev` address is enough for the first deployment.

Do not continue with the production deployment until the API, database, upload
storage, and any required Redis service are ready. If the backend is not yet
deployed, follow [the Vercel deployment guide](./vercel-deployment.md) first.

## Values used in this guide

Choose these two values before starting:

| Value | Example | Meaning |
| --- | --- | --- |
| Worker name | `jhon-portfolio` | The public Cloudflare application name. Use lowercase letters, numbers, and dashes. |
| API origin | `https://api.example.com` | The backend address without `/api` and without a trailing slash. |

From the example API origin, the frontend build variable is:

```text
VITE_API_ENDPOINT=https://api.example.com/api
```

Keep the difference clear:

- `VITE_API_ENDPOINT` includes `/api`.
- Backend `APP_DOMAIN` contains the frontend website origin and does not
  include `/api`.

## Step 1: Check that the backend is ready

Open these URLs in a browser, replacing the example domain:

```text
https://api.example.com/api/health
https://api.example.com/api/projects
```

The health endpoint should return a successful response. The projects endpoint
should return public portfolio data rather than a connection or server error.

The backend host must contain its own database, JWT, Blob/object storage,
Redis, mail, and OpenAI settings. Never copy those secrets into Cloudflare
frontend variables.

## Step 2: Install Wrangler in the frontend project

Wrangler is Cloudflare's deployment tool. Open PowerShell and run:

```powershell
cd C:\Users\Lenovo\Desktop\PROJECTS\PERSONAL\MY_PORTFOLIO\portfolio-client
npm.cmd install --save-dev wrangler@4
npx.cmd wrangler --version
```

This updates `package.json` and `package-lock.json`. Commit both files so local
and Cloudflare builds use the same dependency set.

## Step 3: Add the Cloudflare configuration

Create `portfolio-client/wrangler.jsonc` with the following content. Replace
`jhon-portfolio` with the Worker name you chose above.

```jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "jhon-portfolio",
  "compatibility_date": "2026-10-31",
  "assets": {
    "directory": "./client-dist",
    "not_found_handling": "single-page-application"
  }
}
```

The important settings are:

- `directory` matches this project's custom Vite output folder,
  `client-dist`. Do not change it to the usual Vite `dist` folder.
- `single-page-application` makes direct visits and browser refreshes work for
  Vue Router paths such as `/login`, `/gears`, and `/admin/dashboard`.
- No `main` Worker script is required because Cloudflare only serves static
  frontend assets in this deployment.

The Worker name in this file must exactly match the application name used in
the Cloudflare dashboard.

## Step 4: Build the production frontend locally

In the same PowerShell window, temporarily set the real API URL and run the
locked install and production build:

```powershell
$env:VITE_API_ENDPOINT = 'https://api.example.com/api'
npm.cmd ci
npm.cmd run build
```

Expected result:

- Type checking succeeds.
- Vite finishes without errors.
- `portfolio-client/client-dist/index.html` exists.

`VITE_API_ENDPOINT` is public build configuration. It will be visible in the
browser bundle, which is expected for a public API address. Never use a `VITE_`
variable for a password, token, private key, database URL, or API secret.

To clear the temporary PowerShell value after the check:

```powershell
Remove-Item Env:VITE_API_ENDPOINT
```

Do not commit `client-dist`; Cloudflare will build it from source.

## Step 5: Commit and push the deployment files

From the repository root, review and push the intended changes:

```powershell
cd C:\Users\Lenovo\Desktop\PROJECTS\PERSONAL\MY_PORTFOLIO
git status
git add portfolio-client/package.json portfolio-client/package-lock.json portfolio-client/wrangler.jsonc docs/cloudflare-deployment.md
git commit -m "Prepare portfolio frontend for Cloudflare Workers"
git push
```

Check `git status` before committing so unrelated local work is not included.
Cloudflare deploys the pushed revision, not uncommitted files on the computer.

## Step 6: Create the Cloudflare Worker from the repository

1. Sign in to the [Cloudflare dashboard](https://dash.cloudflare.com/).
2. Open **Workers & Pages**.
3. Select **Create application**.
4. Select **GitHub** or **GitLab**.
5. Authorize Cloudflare if prompted, then select the repository containing
   `MY_PORTFOLIO`.
6. Enter the same Worker name used in `wrangler.jsonc`.
7. Select the production branch, normally `main`.
8. Configure the build using the next table.

Use these build settings:

| Cloudflare setting | Value |
| --- | --- |
| Root directory | `portfolio-client` |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Production branch | The release branch, normally `main` |

The root directory is required because this repository contains separate
client and server applications. Leave Cloudflare's preview command at its
default unless you have intentionally designed a separate preview workflow.

## Step 7: Add the build variables

On the same project configuration screen used in Step 6, expand **Build
Variables and Secrets** and add the following values. After the Worker has been
created, you can edit them under **Settings** > **Build** > **Build Variables
and Secrets**:

| Variable | Value | Why it is needed |
| --- | --- | --- |
| `NODE_VERSION` | `22` | Pins a Node version compatible with this project instead of following Cloudflare's changing default. |
| `VITE_API_ENDPOINT` | `https://api.example.com/api` | Tells the browser build where the NestJS API is hosted. |

Replace the example API domain with the actual backend domain.

These must be **build variables**. Adding `VITE_API_ENDPOINT` only as a Worker
runtime variable will not update an already compiled Vite bundle. Whenever its
value changes, run a new build and deployment.

Do not add backend credentials here. Cloudflare build variables and Worker
runtime variables are not a replacement for the backend host's secret store.

## Step 8: Run and inspect the first deployment

1. Select **Save and Deploy**.
2. Open the build log.
3. Confirm dependency installation completes.
4. Confirm `npm run build` creates `client-dist`.
5. Confirm `npx wrangler deploy` uploads the static assets.
6. Open the generated `workers.dev` URL.

If the deployment succeeds but the site shows a blank page or `404`, check:

- Root directory is `portfolio-client`.
- Build command is `npm run build`.
- `wrangler.jsonc` uses `./client-dist`.
- `not_found_handling` is `single-page-application`.
- The Worker name in Cloudflare exactly matches the name in `wrangler.jsonc`.

Copy the exact `https://...workers.dev` website origin. Do not copy a path or
add a trailing slash.

## Step 9: Allow the Cloudflare site in backend CORS

On the backend host, set `APP_DOMAIN` to the exact Cloudflare frontend origin:

```text
APP_DOMAIN=https://jhon-portfolio.YOUR-SUBDOMAIN.workers.dev
```

If both an old frontend and the Cloudflare frontend must work during the
transition, use the comma-separated format supported by this backend:

```text
APP_DOMAIN=https://old-frontend.example.com,https://jhon-portfolio.YOUR-SUBDOMAIN.workers.dev
```

Save the setting and redeploy or restart the backend.

Do not use `APP_DOMAIN=*`. This application uses credentialed browser requests
and Socket.IO, so the backend must allow explicit frontend origins.

## Step 10: Test the complete application

Use a new private/incognito browser window and complete these checks:

1. Open the home page.
2. Open `/gears` directly and refresh the browser. It should not return `404`.
3. Confirm projects, experience, certifications, branding, and photographs load.
4. In browser developer tools, check **Network** for failed API requests and
   CORS errors.
5. Confirm uploaded images and certificates load from durable storage.
6. Sign in with a safe test account and open a protected page.
7. Test one non-destructive admin read operation.
8. Test Socket.IO chat or notifications if realtime features are enabled.
9. Check the browser console for errors.
10. Check the site on a phone-sized screen and with keyboard navigation.

If API calls fail:

- Confirm `VITE_API_ENDPOINT` includes `/api` and has no extra path.
- Confirm the API is reachable over HTTPS.
- Confirm backend `APP_DOMAIN` contains the exact `workers.dev` origin.
- Redeploy the frontend after changing a Vite build variable.
- Redeploy or restart the backend after changing `APP_DOMAIN`.

The deployment is only **locally verified** after Step 4. It is **deployed**
after Step 8, and it is **accepted for normal use** only after the checks in
this step pass in the production environment.

## Step 11: Add a custom domain (optional)

The domain must be in an active Cloudflare zone. If it is not, keep using the
`workers.dev` URL until the zone has been added and its DNS reviewed.

1. Open **Workers & Pages** and select the Worker.
2. Open **Settings** > **Domains & Routes**.
3. Select **Add** > **Custom Domain**.
4. Enter the hostname, such as `www.example.com`.
5. Confirm the change. Cloudflare creates the required DNS record and
   certificate.
6. Wait until the hostname is active, then open it over HTTPS.
7. Add the new origin to backend `APP_DOMAIN` and redeploy the backend:

   ```text
   APP_DOMAIN=https://jhon-portfolio.YOUR-SUBDOMAIN.workers.dev,https://www.example.com
   ```

8. Repeat the complete checks from Step 10 using the custom domain.

Do not delete or overwrite an existing DNS record without first confirming
what service uses it. Choose one canonical hostname and add a redirect for an
alternate hostname only after the primary hostname works.

## Step 12: Keep previews separate from production

Cloudflare can build previews for non-production branches. Preview URLs may be
public, and they should not automatically use production services.

For a safe preview environment:

- Use a staging API with separate database, upload storage, Redis, mail, and
  third-party integration settings.
- Set the preview build's `VITE_API_ENDPOINT` to the staging API.
- Add only the intended preview origins to the staging API's `APP_DOMAIN`.
- Protect preview URLs with Cloudflare Access when the preview contains
  private or unfinished content.

Until a staging backend exists, do not test forms, email, admin writes, or chat
from preview builds against production.

## Step 13: Deploy future frontend updates

With Workers Builds connected to Git, a push to the configured production
branch starts a new build and deployment.

For every release:

1. Run `npm.cmd ci` and `npm.cmd run build` in `portfolio-client`.
2. Review and commit only the intended files.
3. Push the release commit.
4. Watch the Cloudflare build log.
5. Run the smoke checks from Step 10.
6. Keep the previous working version until the new deployment is verified.

## Step 14: Roll back a broken frontend deployment

1. Open **Workers & Pages** and select the Worker.
2. Open **Deployments**.
3. Find the last known-good version.
4. Open its three-dot menu and select **Rollback**.
5. Confirm the rollback, then repeat the smoke checks.

A Worker rollback restores the previous frontend assets and Worker
configuration. It does not undo backend deployments, database migrations,
database writes, emails, or uploaded files. Handle those through their own
backend recovery procedures.

## Database changes are a separate backend release

Never run Prisma migrations in the Cloudflare frontend build.

When a backend release includes a database migration:

1. Back up the production database.
2. Confirm the documented restoration procedure is usable.
3. Apply the checked-in migration through the backend release process.
4. Deploy and verify the backend.
5. Deploy the frontend only after the compatible API is ready.

From `portfolio-server`, this project exposes the production migration command:

```powershell
npm.cmd run db:migrate
```

Run it only as part of an intentional backend release. Creating a Cloudflare
Worker is not a reason to migrate the database.

## Troubleshooting quick reference

| Problem | Check |
| --- | --- |
| Build runs in the wrong folder | Root directory must be `portfolio-client`. |
| Build succeeds but deployment cannot find files | `assets.directory` must be `./client-dist`. |
| Refreshing `/login` or `/admin/dashboard` returns `404` | Set `not_found_handling` to `single-page-application`. |
| Worker name mismatch error | Dashboard application name and `wrangler.jsonc` `name` must match exactly. |
| API requests go to the Cloudflare domain | Set the build variable `VITE_API_ENDPOINT` to the external backend URL and redeploy. |
| Browser reports a CORS error | Add the exact frontend origin to backend `APP_DOMAIN`, then restart/redeploy the API. |
| Images under `/uploads` fail | Confirm the API uses durable production storage and returns public or signed URLs correctly. |
| Login works but realtime does not | Check the backend Socket.IO endpoint, Redis configuration, HTTPS, and the same CORS origin list. |
| A changed variable has no effect | Vite variables are compiled at build time; trigger a new frontend build. |

## Final deployment checklist

- [ ] The backend health and public projects endpoints work over HTTPS.
- [ ] Wrangler 4 is recorded in `package.json` and `package-lock.json`.
- [ ] `wrangler.jsonc` uses the correct Worker name and `client-dist` directory.
- [ ] The local production frontend build passes.
- [ ] Cloudflare root directory is `portfolio-client`.
- [ ] Build command is `npm run build`.
- [ ] Deploy command is `npx wrangler deploy`.
- [ ] `NODE_VERSION=22` is configured as a build variable.
- [ ] `VITE_API_ENDPOINT` is the correct HTTPS API URL ending in `/api`.
- [ ] Backend `APP_DOMAIN` contains the exact deployed frontend origin.
- [ ] Direct navigation and refresh work on nested Vue routes.
- [ ] Public content, authentication, uploads, and enabled realtime features work.
- [ ] No database URLs, tokens, passwords, or API secrets were added to frontend variables.
- [ ] A known-good frontend version is available for rollback.

## Moving the API to Cloudflare is a separate project

The NestJS backend is not a drop-in static Worker. It currently depends on
Prisma, PostgreSQL, native password hashing, Socket.IO, Redis Pub/Sub, SMTP,
OpenAI, and durable uploads. This repository does not yet contain a validated
Cloudflare runtime design for those dependencies.

Do not point Cloudflare's Worker root directory at `portfolio-server`. A future
API migration would require separate architecture, implementation, security,
data migration, load testing, monitoring, backup, and rollback work.

## Official Cloudflare references

- [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/)
- [Single-page application routing](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/)
- [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/)
- [Workers Builds configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)
- [Workers Builds build image and Node versions](https://developers.cloudflare.com/workers/ci-cd/builds/build-image/)
- [Workers custom domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)
- [Workers rollbacks](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/)
