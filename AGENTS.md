# Portfolio project instructions

The user approved migrating to an integrated Vue + Cloudflare Workers + D1 app
on Cloudflare Free. This supersedes the earlier NestJS/PostgreSQL and Laravel
directions. Keep one root package, build and deployment; do not restore separate
client/server applications or introduce a paid service without user direction.

Read `docs/cloudflare-unified-architecture.md`, `docs/cloudflare-deployment.md`
and `docs/ENGINEERING_ACCEPTANCE.md` before architecture or deployment changes.
Also follow the workspace engineering memory and standard.

- Vue UI: `src/`. Worker API: `worker/`. Database: `migrations/`.
- Preserve the existing portfolio design and public/admin/client feature paths.
- Use same-origin `/api`, `/uploads` and `/socket`; never expose server secrets
  through VITE variables or add a separate backend origin.
- Validate bounded request bodies with Zod, authorize on the server, return the
  consistent success/message/data envelope, and preserve soft-delete behavior.
- Protect owner administration, last-owner integrity, client-owned requests,
  private notifications, revocable sessions, MFA challenge binding and replay checks.
- Use atomic D1 batches for related writes. Never replace them with transaction
  stubs or weaker best-effort writes. Check query counts against Free limits.
- Password hashing and QR generation run in the Durable Object. Do not reduce
  password work factors to meet ordinary Worker CPU limits.
- Uploads are public assets with bounded size/chunks and a 256 MiB media budget.
- Native WebSockets use hibernation and restore subscriptions after reconnect.
- Optional AI/email failures must leave persisted inquiries and fallback usable;
  do not claim a reply was emailed merely because it was saved or queued.
- Use `npm run typecheck`, `npm test`, `npm run test:browser`, `npm run build`
  and `npm run deploy:check` as relevant. Tests must use isolated data.
- Never commit `.dev.vars`, `.env`, `.wrangler`, database snapshots, upload files,
  private import reports, backup archives, dependencies or build/test artifacts.
- Keep private restoration evidence outside Git. Export PostgreSQL read-only;
  require an empty D1 target for import. Preserve the original backup until
  remote deployment and intended-workload acceptance are separately verified.
- Keep evidence in this project; distinguish implementation, local checks,
  actual deployment and workload acceptance. Preserve the Lenovo user's ownership.

Run all Git/npm commands at the repository root. Historical documents in
`docs/legacy/` describe the retired stack and are not current implementation rules.
