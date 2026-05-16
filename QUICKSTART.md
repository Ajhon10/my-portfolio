# Quick Start - MY PORTFOLIO

Use this when setting up the project locally.

## 1. Backend

```bash
cd portfolio-server
npm install
cp .env.example .env
```

Update `.env`, especially:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
APP_DOMAIN=http://localhost:5173
ACCESS_TOKEN_SECRET=change-me
OPENAI_API_KEY=
MAIL_HOST=
MAIL_PORT=
MAIL_USER=
MAIL_PASS=
```

Run migrations and seed data:

```bash
npx prisma migrate dev --schema ./src/database/schema
npm run migrate:seed
```

Start the API:

```bash
npm run start:dev
```

Backend: `http://localhost:3000/api`

Swagger: `http://localhost:3000/docs`

## 2. Frontend

```bash
cd portfolio-client
npm install
```

Create `.env.local`:

```env
VITE_API_ENDPOINT=http://localhost:3000/api
```

Start the app:

```bash
npm run dev
```

Frontend: `http://localhost:5173`

## 3. Login

```text
Email: admin@portfolio.local
Password: Admin@123456
```

## 4. First Admin Tasks

1. Go to Admin > Site Content.
2. Update Branding: logo, favicon, browser title, meta description.
3. Update Hero Section content.
4. Add social links.
5. Review tech stack seed data in Admin > Tech Stack.
6. Add projects, experience, and certifications.
7. Test the public inquiry form.
8. In Admin > Client Requests, create a client account for an inquiry if project chat is needed.

## 5. Useful Checks

```bash
cd portfolio-client
npm run build

cd ../portfolio-server
npm run build
```

## 6. Deployment Notes

Vercel:

```text
Root directory: portfolio-client
Build command: npm run build
Output directory: client-dist
VITE_API_ENDPOINT=https://your-backend.onrender.com/api
```

Render:

```text
Root directory: portfolio-server
Build command: npm install && npx prisma generate --schema ./src/database/schema && npm run build
Start command: npx prisma migrate deploy --schema ./src/database/schema && npm run start:prod
```

After deployment, run or trigger:

```bash
npm run migrate:seed
```

This ensures baseline tech stack, site content, chatbot tags, and admin user data exist.

## Troubleshooting

### Missing database columns

Run:

```bash
cd portfolio-server
npx prisma migrate deploy --schema ./src/database/schema
```

### Logo, favicon, or uploads not loading in production

Check:
- `VITE_API_ENDPOINT` points to the Render API URL.
- Render serves `/uploads`.
- Uploaded file URL exists in Site Content.

### Socket/realtime not working

Check:
- Backend is restarted after gateway changes.
- Frontend `VITE_API_ENDPOINT` uses the same backend host.
- The logged-in user has the right role.
