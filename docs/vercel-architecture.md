# Vercel deployment architecture

Decision date: 20 October 2026 (Asia/Manila).

The user requested deployment support for both applications on Vercel. Preserve
the existing Vue 3 / TypeScript / Vite frontend, NestJS 10 / TypeScript backend,
Prisma 5 and PostgreSQL database. Keep the client and server as separate Vercel
projects rooted at `portfolio-client` and `portfolio-server` in this repository.
No framework or database-engine migration is needed.

Vercel Functions run the API; a managed PostgreSQL service holds durable records.
PostgreSQL can be provisioned and connected through Vercel Marketplace (for
example Neon). It is operated by the database provider, not inside a Function.
Changing to PDEA's PHP/Laravel stack would not make a database run inside Vercel.

Use Vercel Blob for public portfolio assets, including certificates. Only
OWNER/ADMIN users may obtain short-lived, path/type/size-constrained upload tokens.
Browsers upload bytes directly to Blob so the existing 8 MiB image and 12 MiB
certificate limits do not run into the Function request-body limit. Project
gallery attachment is a separate authenticated request that verifies Blob metadata.
Retain local disk uploads for ordinary local development only.

Use a Redis service with the Redis wire protocol and Pub/Sub (for example the
Vercel Marketplace Redis integration) to coordinate Socket.IO instances. Rooms,
presence and takeover queries must use the distributed adapter, not process-local
maps. Use WebSocket transport, restore subscriptions after reconnect, and reload
stored chat history to recover messages missed while disconnected. Vercel's
WebSocket support is currently beta and requires Fluid compute.

Trust boundaries: browser -> authenticated API -> PostgreSQL; browser -> scoped
Blob upload token -> public Blob store; API instances -> private Redis. Database,
Redis, Blob read-write, JWT, mail and AI credentials belong only to the backend.
Public frontend configuration contains only service URLs.

Production migration is an explicit release operation using a direct database
connection. Application requests use the provider's pooled connection. Preview
deployments must use isolated databases, Redis namespaces and Blob stores.

Open operational choices: Vercel account/projects, database and Redis providers,
regions, domains, budget, expected workload, backup objectives and existing-upload
transfer. No external resource is provisioned by source changes. See
`vercel-deployment.md` and `ENGINEERING_ACCEPTANCE.md` for setup and evidence.

References checked on the decision date:
- https://vercel.com/docs/frameworks/backend/nestjs
- https://vercel.com/docs/functions/websockets
- https://vercel.com/docs/storage
- https://vercel.com/docs/vercel-blob/client-upload
- https://socket.io/docs/v4/redis-adapter/
- https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections
