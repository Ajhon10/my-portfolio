# Complete Cloudflare setup for this portfolio

Updated: 5 November 2026 (Asia/Manila).

Finish the existing **my-portfolio** Worker; keep its current workers.dev address.
The Vue interface, API and live chat deploy together from this repository root.
Core hosting uses Cloudflare Workers, D1 and a SQLite Durable Object on Workers
Free, within service quotas. Optional AI/mail providers have separate accounts.

PR #6 is now merged into `main` at `2c28da4`. That commit contains the root
package.json. The November 4 build at `7c95f1b` used the retired layout; retrying
that old revision will still fail to find package.json.

## Starting point

| Item                           | State when this guide was updated                                                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Application source             | Migrated, locally verified, pushed and merged into main.                                                                                         |
| Existing Cloudflare Worker     | Keep `my-portfolio`.                                                                                                                             |
| Production D1 ID               | Still an all-zero placeholder in wrangler.jsonc.                                                                                                 |
| Portfolio data                 | Restored locally and now verified in the configured remote D1: 184 records and 14 media files. Skip the completed import and continue at step 7. |
| Private restore files          | Present on this workstation and in the private backup.                                                                                           |
| Production secret/login        | Must be configured below. Local secrets are not uploaded by Git.                                                                                 |
| Deployment/workload acceptance | Requires remote verification; local checks do not establish production capacity.                                                                 |

Follow steps 1–9 in order. Run terminal commands individually and continue only
after each succeeds. **Cloudflare dashboard** means your browser; **PowerShell**
means the VS Code terminal or Windows Terminal on your PC.

## 1. Confirm the existing Worker's Git/build settings

**Cloudflare dashboard:** select the account containing the portfolio, then
**Workers & Pages → my-portfolio → Settings → Builds**. The section may be
labelled **Build** in your dashboard.

| Setting                   | Value                                                                              |
| ------------------------- | ---------------------------------------------------------------------------------- |
| Worker name               | `my-portfolio`                                                                     |
| Git repository            | `Ajhon10/my-portfolio`                                                             |
| Production branch         | `main`                                                                             |
| Root directory            | `/` (repository root)                                                              |
| Build command             | `npm run build`                                                                    |
| Production deploy command | `npx wrangler deploy`                                                              |
| Build variable            | `NODE_VERSION` = `22`                                                              |
| Preview builds            | Leave disabled for initial production setup; configure them separately in step 10. |

Keep a correct existing Git connection. If missing, use **Connect** and select
that repository. The Worker name must match `name` in wrangler.jsonc.

Leave automatic dependency installation enabled. The root package-lock.json
selects npm. Build tools are devDependencies, so do not install with `--omit=dev`.
There is no separate Pages output-directory setting: Wrangler deploys the
generated Worker configuration and `dist/client` assets together.

The build token authenticates Cloudflare's deployment system; it is separate
from AUTH_SECRET. Keep a valid token for the intended account. See troubleshooting
below if Cloudflare reports an account/permission error.

Sources: [existing Worker connection](https://developers.cloudflare.com/workers/ci-cd/builds/),
[build settings](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/),
[Node version and dependency installation](https://developers.cloudflare.com/workers/ci-cd/builds/build-image/).

## 2. Prepare the repository and sign in from your PC

**PowerShell:**

```powershell
Set-Location 'C:\Users\Lenovo\Desktop\PROJECTS\PERSONAL\MY_PORTFOLIO'
git status --short
```

Preserve any unfinished Git changes before switching branches. With a clean
working tree, get the merged app and make a branch for the production binding:

```powershell
git fetch origin
git switch main
git pull --ff-only origin main
git switch -c setup/cloudflare-production
node --version
npm.cmd ci
npx.cmd wrangler login
npx.cmd wrangler whoami
```

Node must be 22.14 or newer. Login opens a browser; authorize the account that
owns my-portfolio and return to the terminal. Confirm that whoami lists that
account. If the setup branch already exists from a previous attempt, switch to
it with `git switch setup/cloudflare-production` instead of creating it again.

Use `npm.cmd`/`npx.cmd` in PowerShell to avoid the blocked `.ps1` launchers.
Changing Windows execution policy is unnecessary.

## 3. Create or identify the production D1 database

**Cloudflare dashboard:** search for **D1 SQL Database**, select **Create database**
and name it **portfolio** in the same account as the Worker. If it already
exists, open it instead of creating a duplicate.

Copy the **Database ID** from its details page. This is not your account ID,
password or API token. The database identifier can be committed in configuration.

The terminal alternative is `npx.cmd wrangler d1 create portfolio`; use one
creation method once. If Wrangler offers to edit your file, review the result
and keep binding name `DB`.

[D1 creation and binding instructions](https://developers.cloudflare.com/d1/get-started/).

## 4. Replace the placeholder ID and build locally

**VS Code:** edit wrangler.jsonc and replace the all-zero database_id with the
actual ID from step 3. Keep binding, name and migrations directory unchanged:

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "portfolio",
    "database_id": "PASTE-YOUR-REAL-DATABASE-ID-HERE",
    "migrations_dir": "migrations"
  }
]
```

The PASTE text above is an example, not a usable ID. Save your real value.
Adding only a dashboard binding is insufficient: the repository's Wrangler
configuration must point to the correct database too.

**PowerShell:**

```powershell
npm.cmd run build
npm.cmd run deploy:check
```

These commands do not publish the site. Build after changing the ID: Vite
generates configuration under dist/, and Wrangler can redirect later commands
to that generated file. Rebuilding keeps the generated ID current. A successful
dry run does not create database tables or prove remote permissions.

## 5. Prepare AUTH_SECRET for the first full Worker deployment

If Cloudflare says **Variables/Bindings cannot be added to a Worker that only
has static assets**, the current deployment has no Worker script. The missing
Add button is expected. Keep the existing Worker; its full application code and
secret can be uploaded together in step 8. Do not wait for that dashboard button.

For first setup, create a private JSON file in your existing portfolio folder:

```powershell
node -e "const fs=require('node:fs'); fs.mkdirSync('.wrangler/private',{recursive:true}); fs.writeFileSync('.wrangler/private/production-secrets.private.json',JSON.stringify({AUTH_SECRET:require('node:crypto').randomBytes(48).toString('base64url')}),{flag:'wx',mode:0o600}); console.log('Private secret file created; no secret value printed.');"
```

This stores a random AUTH_SECRET without printing it. The path is ignored by
Git. If the command reports EEXIST, a file is already present: reuse it after
checking privately that it is your intended production secret file; do not
replace an established encryption key. Save the file in your private recovery
backup too. Never upload it to GitHub or paste its contents into chat.

If this app already has a valid production AUTH_SECRET on a script-backed
Worker, keep it and skip generating a new one. In step 8 use the existing-secret
deployment alternative. AUTH_SECRET encrypts authenticator enrollment; it is
separate from your owner password, Cloudflare login and build token.

After the first full deployment, runtime secrets can be managed under
**my-portfolio ? Settings ? Variables and Secrets ? Production**, or using
`npx.cmd wrangler secret put AUTH_SECRET`. Keep the value stable after enrollment.
Do not set it as a VITE variable or a build-only variable.

SESSION_HOURS=`8` and OPENAI_MODEL=`gpt-4o-mini` are already non-secret Wrangler
variables. Leave optional AI/mail secrets absent for the initial deployment.

[Cloudflare supports uploading secrets alongside Worker code](https://developers.cloudflare.com/workers/configuration/secrets/#upload-secrets-alongside-code).

## 6. Apply remote migrations and restore your portfolio

**PowerShell:** check that your prepared private import exists:

```powershell
Test-Path '.wrangler/private/legacy-import/records.private.sql'
Test-Path '.wrangler/private/legacy-import/report.private.json'
```

Both should return True on the existing workstation. For a fresh clone, restore
the private archive as described under Recovery before continuing.

Apply the database schema:

```powershell
npm.cmd run db:migrate:remote
```

Review the database name and migration prompt. Five migrations create the
application/auth/media tables and integrity rules. Re-running applies only
unapplied migrations; it should report none remaining after success.
[D1 migration commands](https://developers.cloudflare.com/d1/wrangler-commands/).

Import the prepared records and uploads into the empty migrated database:

```powershell
node scripts/migration/apply-legacy.mjs --remote
```

Keep `--remote`; without it, the helper writes locally. The helper refuses a
populated target and imports records before media. For this snapshot, expect
**15 import parts, 184 records and 14 media files**.

Do not run public seeds or create a new owner before this import; they populate
the target and cause its empty-database guard to reject it. If restoration
already completed, verify the counts and skip importing again. If it stopped
midway, inspect its private log/report before deciding how to resume. Do not
clear a database containing real records to bypass the guard. With the updated
helper, resume this exact snapshot using:

```powershell
node scripts/migration/apply-legacy.mjs --remote --resume
```

Resume compares every stored record field in all 20 application tables with the
private recovery SQL. It verifies existing media metadata and exact chunk bytes,
skips completed parts and uploads only missing ones. Changed records, unknown
media or incomplete/corrupted existing files cause it to stop without deleting
or overwriting them. After resetting passwords or editing content, the snapshot
no longer matches; resume is not a way to overwrite newer production data.

The helper uses Node's in-memory SQLite support to inspect the recovery SQL.
Node 22 may print an ExperimentalWarning; this is separate from an import error.
Wrangler can print upload progress before its JSON response even with --json;
the updated parser accepts that progress and still requires a valid D1 result.
Raw failure output is stored privately under .wrangler/private.

Verify baseline counts and relationships with read-only queries:

```powershell
npx.cmd wrangler d1 execute portfolio --remote --command 'SELECT (SELECT COUNT(*) FROM project) AS projects, (SELECT COUNT(*) FROM site_content) AS site_content, (SELECT COUNT(*) FROM media_files) AS media_files, (SELECT SUM(bytes) FROM media_files) AS media_bytes;'
npx.cmd wrangler d1 execute portfolio --remote --command 'PRAGMA foreign_key_check;'
```

Expect projects=`4`, site_content=`38`, media_files=`14`, media_bytes=`22829795`
and no foreign-key violations. These counts change after later CMS edits.

## 7. Reset the imported owner's password

**PowerShell:**

```powershell
npm.cmd run owner:create -- --remote --reset
```

Enter the existing owner email and choose a new password of 12–128 characters.
Press Enter after the email. At **New password**, type or paste your password;
the updated prompt displays asterisks instead of the actual characters. Press
Enter, then enter the same password at **Confirm password** and press Enter again.
This updates that account and revokes sessions; it does not create another owner.

If an older prompt is stuck, press Ctrl+C and rerun after updating the helper.
Run it directly in PowerShell or the VS Code terminal; do not pipe input into
the interactive password prompt. A confirmation mismatch or Ctrl+C cancels input
before the database update. Keep your password in the terminal, not chat/GitHub.

The old Argon2 credential cannot authenticate in this runtime, so copying records
does not preserve the old login password. Authenticator setup was explicitly
cleared for this import; enrollment happens after deployment. There is no default
administrator password.

## 8. Deploy the full Worker with its secret, then connect main

After migrations/import and owner reset have succeeded, run this from the
portfolio folder containing your real D1 ID and the private file from step 5:

```powershell
npm.cmd run build
npx.cmd wrangler deploy --secrets-file .wrangler/private/production-secrets.private.json
```

This is the first real deployment: it uploads the API script, Vue assets,
configured bindings and AUTH_SECRET to the existing my-portfolio Worker. It
replaces the static-only deployment. A dry run does not perform this conversion.
The source config already declares `main: worker/index.ts`; do not remove it or
upload only the dist/client directory. No temporary Worker or new project is needed.

If a valid AUTH_SECRET is already installed on a script-backed Worker and you
skipped the private-file step, use `npm.cmd run deploy` instead. Omitted existing
secrets are retained by subsequent deployments.

Refresh Cloudflare Settings after deployment. The runtime Variables and Secrets
and Bindings sections should now be available. Confirm AUTH_SECRET is present as
an encrypted secret and check `/api/health` before proceeding. If the static-only
message remains, inspect the specific deploy error and commit/config: successful
upload of assets alone is insufficient.

**PowerShell:** now review and upload the database configuration change:

```powershell
git diff -- wrangler.jsonc
git add wrangler.jsonc
git diff --cached --name-only
git commit -m "Configure production Cloudflare D1 database"
git push -u origin setup/cloudflare-production
```

The staged list should show only the intended public configuration. Do not stage
.dev.vars, .wrangler, snapshots or private SQL.

Create a pull request from setup/cloudflare-production into main, review the
database ID and merge it. In **Cloudflare → my-portfolio → Deployments/Builds**,
select the new main build and confirm its commit matches that merge. Watch
installation, building and deployment. If it does not start, trigger a build for
latest main; retrying an old revision will not update its source code.

Successful Wrangler deployment configures these resources:

| Resource                         | Expected configuration                          | Manual work                                       |
| -------------------------------- | ----------------------------------------------- | ------------------------------------------------- |
| D1                               | `DB` → production portfolio database ID         | Created/migrated/imported in steps 3–6.           |
| Durable Object                   | `PORTFOLIO_HUB` → `PortfolioHub`, SQLite-backed | Class migration provisions it automatically.      |
| Static assets                    | `ASSETS` → generated dist/client                | Deployed with the Worker.                         |
| Scheduled maintenance/mail retry | `*/15 * * * *`                                  | Already declared in Wrangler.                     |
| Runtime configuration            | AUTH_SECRET plus declared non-secret vars       | Prepared in step 5; uploaded with code in step 8. |

Keep the existing `new_sqlite_classes` migration. SQLite Durable Objects are
available on Workers Free; this class handles live presence/chat and password
work. [Durable Object limits](https://developers.cloudflare.com/durable-objects/platform/limits/).

The first CLI deployment above establishes the script and secret. Future pushes
to main use the normal Git build/deploy commands and retain existing secrets;
the private JSON file stays on your PC and is not needed in Git or build variables.

## 9. Verify the site and enroll an authenticator

**Browser:** select the Worker's **Visit** button. Its current expected address
is `https://my-portfolio.itsajhon.workers.dev`.

Open `/api/health`. A successful response contains:

```json
{ "success": true, "message": "OK", "data": { "status": "ok", "database": "d1" } }
```

This checks database connectivity, not every table or user flow. Then:

1. Confirm the home page, portrait, uploaded images and projects appear. The
   snapshot has four project records but only three are public.
2. Open `/login`; enter the existing owner email and newly reset password.
3. Scan the enrollment QR in your authenticator and verify a code. Sign in again
   with the next code afterward; a consumed code cannot be reused.
4. Confirm CMS pages load. Save an intentional small edit, reload and check it
   persists. Test an image upload and its public URL.
5. Submit an identifiable test inquiry and verify receipt in the admin. Check
   chatbot replies, live presence/takeover and any client project chat you use.
6. Inspect **Observability → Logs** and Worker/D1/DO usage before accepting the
   deployment for your intended traffic.

Core functionality works without AI/email credentials. A saved CMS reply does
not prove an email was delivered.

## 10. Configure previews separately, after production works

Your earlier GitHub check was a branch preview. Its settings and log are separate
from an older production build. Leave previews off during initial setup.

To enable them later, use **Settings → Builds**, with Preview command
`npx wrangler preview`. Configure a Wrangler `previews` block with a separate
staging D1 database, the PORTFOLIO_HUB binding and required variables. If using
the dashboard's **Previews Base** editor, copy its generated configuration back
into wrangler.jsonc. Apply schema/public seed to staging and give it its own
AUTH_SECRET. Use fixture accounts/data.

Current source has no previews block; production bindings/secrets must not be
assumed to carry over. Cloudflare isolates Preview Durable Object storage, but
D1 data is shared whenever bindings use the same database ID. Bind a different
staging ID before enabling preview writes. `wrangler versions upload` does not
provide database isolation.

Keep class migrations at the top level. Put the staging D1 binding under
`previews.d1_databases`, the live hub binding under
`previews.durable_objects.bindings`, and SESSION_HOURS/OPENAI_MODEL under
`previews.vars`. To set a generated preview-only secret in Previews Base, use
`npx.cmd wrangler preview base-config secret put AUTH_SECRET`. Existing previews
may need their individual secret updated or a new preview created; Base secret
changes apply to newly created previews. Production is unaffected by that command.

Sources: [Preview configuration](https://developers.cloudflare.com/workers/previews/configuration/),
[resource isolation](https://developers.cloudflare.com/workers/previews/resources/).

## Troubleshooting an incomplete setup

If `Unexpected token` points at `├ Checking`, Wrangler printed progress before
JSON. That does not prove the upload failed: a part may already have committed.
Use the fixed helper with `--remote --resume`; do not restart or delete D1.

| Error/symptom                                 | Check and next action                                                                                                                                                                                                       |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ENOENT ... /opt/buildhome/repo/package.json` | Check source commit and root. Use the merged migration or later main with root `/`. November 4's old revision lacks that file.                                                                                              |
| No dependencies detected                      | Confirm root package.json/package-lock.json exist in that build revision and installation is enabled.                                                                                                                       |
| Vite/vue-tsc missing                          | Install devDependencies; remove any `--omit=dev` installation override.                                                                                                                                                     |
| npm rejects the lockfile                      | Compare npm versions. Cloudflare supports an exact packageManager pin in package.json; do not delete the lockfile to hide a failure.                                                                                        |
| Database not found / all-zero ID              | Check real ID and account; rebuild after editing configuration.                                                                                                                                                             |
| `no such table`                               | Apply remote migrations to the database bound to this Worker. Local migrations do not initialize remote tables.                                                                                                             |
| Previous content/images absent                | Confirm private remote import completed. Git does not transfer local database contents.                                                                                                                                     |
| No Add button / static-only message           | Complete step 5 privately, then step 8 to upload Worker code and its secret together. Dashboard runtime bindings become available after a full-script deployment.                                                           |
| Authentication not configured                 | Add AUTH_SECRET as a runtime Secret in the correct environment.                                                                                                                                                             |
| Invalid credentials / reset required          | Use the existing email and `owner:create -- --remote --reset`.                                                                                                                                                              |
| TOTP code already used                        | Wait for a new code and use an automatically synchronized phone clock. Keep AUTH_SECRET stable.                                                                                                                             |
| Live service unavailable / missing binding    | Verify PORTFOLIO_HUB/class migration deployed. Previews need their own declared binding.                                                                                                                                    |
| Account/token permission error                | Verify account/build token. Worker upload needs Workers Scripts access; database lookup/management needs corresponding D1 access. A CI job running migrations/import needs D1 write access. Local steps use Wrangler OAuth. |
| Old Vercel check remains red                  | Old results are historical. If new Vercel builds continue, check for another project still linked to this repository.                                                                                                       |
| Static page loads but API fails               | Check `/api/health` and runtime logs; a previous static-only deployment can serve a page without the new backend.                                                                                                           |

For a new error, capture that build's **commit SHA, environment/branch and first
actual error lines**. A failure badge or a different build's log is insufficient.

## Recovery, backups and a future clone

Private backup location on this workstation:

```text
C:\Users\Lenovo\Desktop\PROJECTS\BACKUPS\MY_PORTFOLIO-before-cloudflare-2026-11-05
```

| Backup                                | Contents                                                                      |
| ------------------------------------- | ----------------------------------------------------------------------------- |
| portfolio-before-cloudflare.gitbundle | Original source/history.                                                      |
| private-config-and-uploads.zip        | Original environment files and all local uploads.                             |
| legacy-postgres.private.json          | Consistent read-only PostgreSQL snapshot: 184 records across 20 models.       |
| cloudflare-private-restore.zip        | Prepared legacy-import SQL/report and the local development secret.           |
| manifest.json / RESTORE.md            | Integrity hashes/recovery notes.                                              |
| retired-source/                       | Preserved original client/server directories, configuration and dependencies. |

Never upload these files to public Git. For a fresh clone, extract the Cloudflare
restore ZIP into a private directory, preserving its legacy-import subdirectory.
Install dependencies, configure the intended D1 ID, build and migrate an empty
target, then use your actual extraction path in:

```powershell
node scripts/test-migration.mjs --dir='C:\private-restore\legacy-import'
node scripts/migration/apply-legacy.mjs --dir='C:\private-restore\legacy-import' --remote
```

The archived secret belongs to the local environment. Keep the separate production
secret from step 5 for this imported production installation.

The snapshot preserves IDs/dates/soft deletes/relationships and rewrites upload
URLs, including JSON image lists. Fourteen files totaling 22,829,795 bytes were
hash-verified. One already-missing thumbnail uses its available gallery image,
as recorded in the private report. Unreferenced original files remain in the ZIP.

Each successful remote SQL-file import is a separate committed recovery step,
not one transaction across the whole set of files. Use verified --resume for an
interrupted run of the same snapshot. A lost/undecodable CLI response does not
prove that the SQL failed. Never erase newer production records to repeat an
old import.

After launch, export fresh remote backups; the old snapshot excludes new CMS
edits. Create/use a real private backup directory and replace the date in:

```powershell
npx.cmd wrangler d1 export portfolio --remote --output='C:\private-backups\portfolio-YYYY-MM-DD.private.sql'
```

Keep AUTH_SECRET separately and copy backups to another device for disk-loss
protection. Preserve the original PostgreSQL database/source until remote
acceptance. [D1 export documentation](https://developers.cloudflare.com/d1/best-practices/import-export-data/).

## Optional integrations, domain and free limits

The workers.dev address is enough to launch. A custom domain can be added later
in the Worker's Domains settings. R2, Containers and another backend/database
host are unnecessary for this implementation.

| Optional runtime secret | Purpose                                                                                 |
| ----------------------- | --------------------------------------------------------------------------------------- |
| OPENAI_API_KEY          | Optional AI answers; absent credentials use grounded local portfolio/knowledge answers. |
| MAIL_API_TOKEN          | Resend HTTP API token.                                                                  |
| MAIL_FROM               | Sender verified with the mail provider.                                                 |
| MAIL_TO                 | Owner address for inquiry notifications.                                                |

These providers have their own limits/billing and were not called in local tests.
Do not copy the retired NestJS/SMTP environment wholesale into Workers. Email
intent persists in mail_outbox; scheduled retries run every 15 minutes, at most
five attempts, with failed rows retained for review. Saved/queued is distinct
from delivered.

Public uploads use D1 chunks: 8 MiB/image, 12 MiB/certificate and a 256 MiB media
budget. The hub caps live connections at 128. Check real CPU, D1 reads/writes and
storage: local tests do not prove Free's 10 ms Worker CPU allowance or traffic
capacity. Consult [Workers limits](https://developers.cloudflare.com/workers/platform/limits/),
[D1 limits](https://developers.cloudflare.com/d1/platform/limits/) and
[Durable Object limits](https://developers.cloudflare.com/durable-objects/platform/limits/).

## Local development and a new PostgreSQL snapshot

For a fresh local database only, `npm.cmd run setup` creates .dev.vars, applies
local schema and seeds public content; `npm.cmd run owner:create` creates a local
owner. These do not configure production. For an existing restored local owner,
use `npm.cmd run owner:create -- --reset` instead. Changing the D1 ID may select
different local state; keep the private import available for local restoration.

`npm.cmd run dev` serves port 5173. Local checks are `npm.cmd test`,
`npm.cmd run test:browser`, `npm.cmd run build` and `npm.cmd run deploy:check`.
Browser tests use isolated fixture data and installed Chrome; the
PLAYWRIGHT_CHANNEL environment variable can select msedge. After building,
`npm.cmd run preview` serves the compiled application at port 8787.

To make a new snapshot, supply DATABASE_URL privately in the shell and run:

```powershell
npm.cmd run legacy:export -- --out=legacy-export.private.json
npm.cmd run legacy:import -- --file=legacy-export.private.json --uploads='path-to-restored-uploads' --reset-2fa --out='.wrangler/private/new-import'
```

Export is read-only. Import generation changes neither database and refuses
missing uploads by default. The explicit `--fallback-missing-thumbnails` option
can use gallery images or null for missing project thumbnails and records that
decision privately. Use a new output directory rather than overwriting recovery
evidence. See [architecture](cloudflare-unified-architecture.md) and
[verification evidence](ENGINEERING_ACCEPTANCE.md) for implementation limits.
