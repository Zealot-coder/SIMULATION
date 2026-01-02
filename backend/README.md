# AI Automation Platform - Backend

Event-driven workflow orchestration backend for the AI Automation Platform.

## 🏗️ Architecture

- **NestJS** - Modular, scalable framework
- **PostgreSQL** - Primary database
- **Prisma** - Type-safe ORM
- **Redis** - Job queues and caching
- **BullMQ** - Job queue management
- **Event-driven** - Workflow orchestration

## 📋 Modules

1. **Auth & Identity** - JWT authentication, user management, roles
2. **Organization** - Multi-tenant support
3. **Event** - Event creation and tracking
4. **Workflow** - Workflow definition and execution engine
5. **AI Service** - Structured AI integration layer
6. **Communication** - WhatsApp/SMS/Email orchestration
7. **Audit** - Logging, compliance, human feedback

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- Docker & Docker Compose (for local development)
- PostgreSQL 15+
- Redis 7+

### Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Set up environment:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Start services with Docker:**
```bash
docker-compose up -d
```

4. **Run Prisma migrations:**
```bash
npm run prisma:migrate
```

5. **Generate Prisma Client:**
```bash
npm run prisma:generate
```

6. **Start development server:**
```bash
npm run start:dev
```

The API will be available at `http://localhost:3001/api/v1`

## 📚 API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login

### Organizations
- `POST /api/v1/organizations` - Create organization
- `GET /api/v1/organizations/my` - Get user's organizations
- `GET /api/v1/organizations/:id` - Get organization details

### Events
- `POST /api/v1/events` - Create event (triggers workflows)
- `GET /api/v1/events` - List events

### Workflows
- `POST /api/v1/workflows` - Create workflow
- `GET /api/v1/workflows` - List workflows
- `GET /api/v1/workflows/:id` - Get workflow details

### AI
- `POST /api/v1/ai/process` - Process AI request

### Communication
- `POST /api/v1/communications/send` - Send message

### Audit
- `GET /api/v1/audit/logs` - Get audit logs
- `POST /api/v1/audit/feedback` - Submit human feedback

## 🔧 Development

### Database

```bash
# Run migrations
npm run prisma:migrate

# Open Prisma Studio
npm run prisma:studio
```

### Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## 🐳 Docker

### Build
```bash
docker build -t ai-automation-backend .
```

### Run
```bash
docker run -p 3001:3001 --env-file .env ai-automation-backend
```

## 📝 Environment Variables

See `.env.example` for all required environment variables.

## 🎯 Key Principles

- **Event-driven**: Workflows triggered by events
- **Auditable**: Every action logged
- **Human-in-the-loop**: Approval steps supported
- **Multi-tenant**: Organization-scoped data isolation
- **AI as service**: Structured AI integration, not direct mutations
