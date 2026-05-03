# MY PORTFOLIO - Full-Stack Application

A modern portfolio application featuring a public showcase site, admin CMS, and AI chatbot assistant.

## 🚀 Features

### Public Site
- **Hero Section**: Animated typing effect showcasing roles (Fullstack Developer, Video Editor, Photographer)
- **Projects Showcase**: Gallery of portfolio projects with filtering and detailed views
- **Tech Stack**: Display of technical skills with proficiency levels
- **Experience Timeline**: Work history and professional background
- **Client Request Form**: Allow visitors to submit project inquiries
- **AI Chatbot Widget**: Intelligent assistant trained on portfolio content

### Admin CMS
- **Projects Management**: Create, edit, delete portfolio projects
- **Tech Stack Management**: Maintain list of skills with categories and proficiency
- **Experience Management**: Add and update work experience
- **Client Requests**: View, reply to, and manage project inquiries
- **Chatbot Training**: Create and manage knowledge base for AI assistant
- **Site Content**: Customize homepage text and messaging
- **User Management**: Create and manage admin accounts (Owner only)

### AI Chatbot
- **Knowledge Base Training**: Train the chatbot with custom Q&A pairs
- **Multi-Source Answers**: Falls back from local KB → OpenAI API → generic response
- **Conversation History**: Store and view past conversations
- **Context Aware**: Uses portfolio projects, tech stack, and experience as context

## 🛠️ Tech Stack

### Backend
- **NestJS** - Progressive Node.js framework
- **PostgreSQL** - Relational database
- **Prisma** - ORM with migrations
- **JWT** - Authentication
- **OpenAI API** - Chatbot intelligence

### Frontend
- **Vue 3** - Reactive UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling
- **Pinia** - State management
- **Vite** - Fast build tool

### Architecture
- **Dependency Injection**: Contract-based providers pattern (DEOS-inspired)
- **Guards & Decorators**: Fine-grained access control
- **Soft Deletes**: Non-destructive record deletion
- **Structured Error Handling**: Consistent API responses

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL 12+
- npm or yarn

## 🔧 Installation

### Backend Setup

```bash
cd portfolio-server
npm install

# Create .env file
cp .env.example .env
# Edit .env with your database URL and API keys

# Run database migrations
npx prisma migrate dev --name init

# Seed initial data (admin user, tech stack, etc.)
npm run migrate:seed

# Start development server
npm run start:dev
```

### Frontend Setup

```bash
cd portfolio-client
npm install

# Create .env.local file
VITE_API_ENDPOINT=http://localhost:3000/api

# Start development server
npm run dev
```

## 🚀 Getting Started

### 1. Start the Backend
```bash
cd portfolio-server
npm run start:dev
```
The API will be available at `http://localhost:3000/api`
Swagger docs: `http://localhost:3000/docs`

### 2. Start the Frontend
```bash
cd portfolio-client
npm run dev
```
The app will be available at `http://localhost:5173`

### 3. Login to Admin CMS
- **Email**: `admin@portfolio.local`
- **Password**: `Admin@123456`

## 📚 API Endpoints

### Public Endpoints
- `GET /api/projects` - List published projects
- `GET /api/projects/:id` - Get project details
- `GET /api/projects/slug/:slug` - Get project by slug
- `GET /api/tech-stack` - List tech stack
- `GET /api/experiences` - List work experiences
- `GET /api/site-content` - Get site content
- `POST /api/chatbot/chat` - Chat with AI assistant
- `POST /api/client-requests/submit` - Submit project inquiry

### Protected Endpoints (Auth Required)

#### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Create account
- `GET /api/auth/whoami` - Get current user
- `POST /api/auth/change-password` - Change password

#### Admin Only
- `POST /api/projects/create` - Create project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

- `POST /api/tech-stack/create` - Add tech
- `PUT /api/tech-stack/:id` - Update tech
- `DELETE /api/tech-stack/:id` - Delete tech

- `POST /api/experiences/create` - Add experience
- `PUT /api/experiences/:id` - Update experience
- `DELETE /api/experiences/:id` - Delete experience

- `GET /api/client-requests` - List requests
- `GET /api/client-requests/:id` - Get request details
- `PUT /api/client-requests/:id/status` - Update status
- `POST /api/client-requests/:id/reply` - Reply to request

- `GET /api/chatbot/knowledge` - List KB entries
- `POST /api/chatbot/knowledge/create` - Add KB entry
- `PUT /api/chatbot/knowledge/:id` - Update KB entry
- `DELETE /api/chatbot/knowledge/:id` - Delete KB entry
- `GET /api/chatbot/conversations` - List conversations

#### Owner Only
- `GET /api/users` - List users
- `GET /api/users/:id` - Get user details
- `POST /api/users/create` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

## 📁 Project Structure

```
MY PORTFOLIO/
├── portfolio-server/              # NestJS backend
│   ├── src/
│   │   ├── common/               # Guards, decorators, filters
│   │   ├── contract/             # DI interfaces
│   │   ├── controller/           # HTTP handlers
│   │   ├── database/             # Prisma schemas
│   │   ├── module/               # NestJS modules
│   │   ├── provider/             # Business logic
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── package.json
│   └── .env.example
│
└── portfolio-client/              # Vue 3 frontend
    ├── src/
    │   ├── components/           # Reusable UI components
    │   ├── composables/          # Hooks & services
    │   ├── router/               # Vue Router
    │   ├── stores/               # Pinia state
    │   ├── types/                # TypeScript types
    │   ├── views/                # Page components
    │   ├── App.vue
    │   └── main.ts
    ├── package.json
    └── vite.config.ts
```

## 🔐 Authentication

The application uses JWT (JSON Web Tokens) for authentication:

1. User logs in with email/password
2. Server validates and returns JWT + user data
3. Frontend stores token in localStorage
4. Token included in Authorization header for protected requests
5. Token expires in 1 day (configurable)

## 🤖 Chatbot Training

Train the chatbot via the Admin CMS:

1. Navigate to **Chatbot > Knowledge Base**
2. Click **Add Knowledge**
3. Fill in:
   - **Topic**: Category (e.g., "Skills", "Services")
   - **Question**: What users might ask
   - **Answer**: Your response
   - **Tags**: Comma-separated keywords
4. Save

The chatbot will:
1. Try to match user question with KB entries using keyword matching
2. If KB match found, return that answer
3. Otherwise, call OpenAI API with portfolio context
4. Fall back to generic message if both fail

## 📧 Email Configuration

The app uses Nodemailer for sending emails (notifications when project requests are submitted, replies to clients).

To configure Gmail:
1. Enable 2-factor authentication
2. Generate app-specific password at https://myaccount.google.com/apppasswords
3. Set in `.env`:
   ```
   MAIL_HOST=smtp.gmail.com
   MAIL_PORT=587
   MAIL_USER=your-email@gmail.com
   MAIL_PASS=your-app-password
   ```

## 🧪 Testing

### API Testing with Postman

Import the API endpoints and test:
- Public endpoints (no auth required)
- Protected endpoints (with JWT)
- Admin-only endpoints (requires OWNER role)

### Manual Testing Checklist

**Public Pages**
- [ ] Hero page loads with animations
- [ ] Projects gallery displays
- [ ] Tech stack shows with proficiency
- [ ] Experience timeline renders
- [ ] Client request form submits
- [ ] Chatbot widget responds

**Admin Pages**
- [ ] Login works
- [ ] Protected routes redirect when not authenticated
- [ ] CRUD forms create/update/delete correctly
- [ ] Pagination works on large lists
- [ ] Search and filters work
- [ ] Chatbot KB training works
- [ ] Conversations are stored

## 🚀 Deployment

### Frontend (Vercel)
```bash
# Push to GitHub
git push origin main

# Vercel auto-deploys on push
# Set VITE_API_ENDPOINT to production API URL
```

### Backend (Railway/Render)
```bash
# Push to GitHub
git push origin main

# Railway/Render auto-deploys on push
# Set environment variables via dashboard
# Run database migrations on first deploy
```

## 📝 Environment Variables

### Backend (.env)
See `.env.example` in portfolio-server directory

### Frontend (.env.local)
```
VITE_API_ENDPOINT=http://localhost:3000/api
```

## 🐛 Common Issues

### Database Connection Error
- Ensure PostgreSQL is running
- Check DATABASE_URL in .env

### JWT Token Invalid
- Clear localStorage and re-login
- Check ACCESS_TOKEN_SECRET is set

### Chatbot Not Responding
- Check OPENAI_API_KEY is set
- Verify knowledge base has entries
- Check network connectivity

## 📚 Additional Resources

- [NestJS Documentation](https://docs.nestjs.com)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Vue 3 Guide](https://vuejs.org)
- [Tailwind CSS](https://tailwindcss.com)
- [OpenAI API](https://platform.openai.com/docs)

## 👤 Author

Jhon Lisley Jeresano
- Email: itsajhon@gmail.com
- Portfolio: (your domain)
- GitHub: (your github)

## 📄 License

This project is private.

---

**Last Updated**: 2026-05-02
**Status**: Alpha - Ready for deployment
