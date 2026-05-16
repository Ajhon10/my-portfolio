# MY PORTFOLIO - File Index

## Root Files

```text
AGENTS.md              Agent/developer rules and role guidance
README.md              Main project overview and setup
QUICKSTART.md          Short local setup guide
CLAUDE.md              Architecture notes
COMPLETED.md           Current completed status
INDEX.md               This file
DELIVERY_SUMMARY.txt   Delivery summary
```

## Client: `portfolio-client/`

```text
src/
  App.vue
  main.ts
  assets/
    main.css
  components/
    Navbar.vue
    Footer.vue
    HeroSection.vue
    TechStackSection.vue
    CertificationsSection.vue
    ChatbotWidget.vue
    RequestForm.vue
    ProjectCard.vue
    DataTable.vue
    Modal.vue
    ConfirmDialog.vue
  composables/
    provider/
      api.provider.ts
      auth.provider.ts
      project.provider.ts
      tech-stack.provider.ts
      experience.provider.ts
      certification.provider.ts
      client-request.provider.ts
      chatbot.provider.ts
      site-content.provider.ts
      notification.provider.ts
    useSiteBranding.ts
    useSocket.ts
    useTheme.ts
    useTypingEffect.ts
  layout/
    PublicLayout.vue
    AdminLayout.vue
  router/
    index.ts
  stores/
    user.ts
    notification.ts
    chatbot.ts
  types/
    index.ts
  views/
    HomeView.vue
    ProjectsView.vue
    ProjectDetailView.vue
    LoginView.vue
    ClientPortalView.vue
    admin/
      DashboardView.vue
      ProjectsCmsView.vue
      TechStackCmsView.vue
      ExperienceCmsView.vue
      CertificationsCmsView.vue
      ClientRequestsView.vue
      ChatbotKbView.vue
      SiteContentView.vue
      UsersView.vue
      ProfileView.vue
```

## Server: `portfolio-server/`

```text
src/
  main.ts
  app.module.ts
  app.migrate.module.ts
  common/
    decorator/
    env/
    filter/
    guard/
    strategy/
    type/
  contract/
    auth.contract.ts
    certification.contract.ts
    chatbot.contract.ts
    client-request.contract.ts
    database.contract.ts
    env.contract.ts
    experience.contract.ts
    mail.contract.ts
    notification.contract.ts
    project.contract.ts
    site-content.contract.ts
    tech-stack.contract.ts
    token.contract.ts
    user.contract.ts
    utility.contract.ts
  controller/
    auth.controller.ts
    certification.controller.ts
    chatbot.controller.ts
    client-request.controller.ts
    experience.controller.ts
    health.controller.ts
    notification.controller.ts
    project.controller.ts
    site-content.controller.ts
    tech-stack.controller.ts
    upload.controller.ts
    user.controller.ts
    request/
    validator/
  database/
    schema/
      auth.prisma
      certification.prisma
      chatbot.prisma
      client-request.prisma
      experience.prisma
      main.prisma
      notification.prisma
      project.prisma
      site-content.prisma
      tech-stack.prisma
      user.prisma
    migrations/
    seed.ts
  gateway/
    realtime.gateway.ts
  module/
  provider/
```

## Key Feature Files

Certifications:

```text
portfolio-server/src/database/schema/certification.prisma
portfolio-server/src/controller/certification.controller.ts
portfolio-client/src/components/CertificationsSection.vue
portfolio-client/src/views/admin/CertificationsCmsView.vue
```

Client portal and realtime project chat:

```text
portfolio-server/src/database/schema/client-request.prisma
portfolio-server/src/provider/client-request.provider.ts
portfolio-server/src/gateway/realtime.gateway.ts
portfolio-client/src/views/ClientPortalView.vue
portfolio-client/src/views/admin/ClientRequestsView.vue
portfolio-client/src/composables/useSocket.ts
```

Site branding:

```text
portfolio-client/src/views/admin/SiteContentView.vue
portfolio-client/src/composables/useSiteBranding.ts
portfolio-client/src/components/Navbar.vue
portfolio-server/src/controller/upload.controller.ts
portfolio-server/src/database/seed.ts
```

## Commands

```bash
cd portfolio-client
npm run build

cd ../portfolio-server
npm run build
npx prisma migrate deploy --schema ./src/database/schema
npm run migrate:seed
```

Last updated: 2026-05-04.
