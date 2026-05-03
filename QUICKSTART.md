# Quick Start Guide - MY PORTFOLIO

Get up and running in 5 minutes.

## Prerequisites
- Node.js 18+
- PostgreSQL running locally
- Git

## Server Setup (2 minutes)

```bash
cd portfolio-server

# 1. Install dependencies
npm install

# 2. Create .env file (copy from example)
cp .env.example .env

# 3. Edit .env with your database URL
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/portfolio

# 4. Run database migrations
npx prisma migrate dev --name init

# 5. Seed initial data
npm run migrate:seed

# 6. Start development server
npm run start:dev
```

✅ Server running at: http://localhost:3000
✅ Swagger docs at: http://localhost:3000/docs

## Client Setup (2 minutes)

```bash
cd portfolio-client

# 1. Install dependencies
npm install

# 2. Start development server
npm run dev
```

✅ Frontend running at: http://localhost:5173

## Login to Admin

Go to http://localhost:5173 and login:
- **Email**: `admin@portfolio.local`
- **Password**: `Admin@123456`

You can now:
1. Add/edit projects
2. Manage tech stack
3. Update experience
4. View client requests
5. Train the chatbot

## First Steps

### 1. Customize Site Content
- Go to Admin > Settings > Site Content
- Update your name, bio, social links

### 2. Add Your Projects
- Go to Admin > Projects > New Project
- Fill in title, description, tech stack, links
- Upload thumbnail image (or use URL)

### 3. Add Your Tech Stack
- Go to Admin > Tech Stack > New Tech
- Add technologies you use with proficiency levels

### 4. Add Your Experience
- Go to Admin > Experience > New Experience
- Add work history with dates

### 5. Train the Chatbot
- Go to Admin > Chatbot > Knowledge Base > New
- Add Q&A pairs about your services
- The bot will use these to answer visitors

## File Locations

**Important Backend Files**:
- Database schemas: `portfolio-server/src/database/schema/`
- API endpoints: `portfolio-server/src/controller/`
- Business logic: `portfolio-server/src/provider/`

**Important Frontend Files** (coming soon):
- Pages: `portfolio-client/src/views/`
- Components: `portfolio-client/src/components/`
- API calls: `portfolio-client/src/composables/provider/`

## Testing API with curl

```bash
# Health check
curl http://localhost:3000/api/health

# List projects (no auth needed)
curl http://localhost:3000/api/projects

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@portfolio.local","password":"Admin@123456"}'

# Use returned accessToken in Authorization header
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/users
```

## Troubleshooting

### "Database connection error"
- Check PostgreSQL is running: `psql --version`
- Update DATABASE_URL in .env
- Try: `createdb portfolio`

### "Module not found"
- Delete `node_modules` and `package-lock.json`
- Run `npm install` again
- Restart dev server

### "Port already in use"
- Backend: Change APP_PORT in .env
- Frontend: Vite will auto-find next available port

## Next: Build Frontend Components

The server is complete and ready! Next step is to scaffold the Vue frontend:
1. Create page components (Home, Projects, Admin Dashboard)
2. Build reusable UI components
3. Create API service layer
4. Style with Tailwind (black/blue theme)
5. Add animations and interactivity

See `CLAUDE.md` for full implementation roadmap.

## Need Help?

Check `README.md` for:
- Full API endpoint documentation
- Architecture details
- Deployment instructions
- Common issues

---

**You're ready to build!** 🚀
