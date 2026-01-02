# Backend Setup Guide

## Quick Setup

The backend needs a `.env` file with database and Redis configuration.

### Step 1: Create `.env` file

Create a file named `.env` in the `backend` directory with this content:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ai_automation?schema=public"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
JWT_EXPIRES_IN=7d

# Application
NODE_ENV=development
PORT=3001
API_PREFIX=api/v1

# AI Service (optional for now)
AI_SERVICE_API_KEY=
AI_SERVICE_URL=https://api.openai.com/v1

# Communication Services (optional)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# WhatsApp Business API (optional)
WHATSAPP_API_KEY=
WHATSAPP_API_URL=

# OAuth Providers
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3001/api/v1/auth/google/callback
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_CALLBACK_URL=http://localhost:3001/api/v1/auth/github/callback
FRONTEND_URL=http://localhost:3000
```

### Step 2: Start PostgreSQL and Redis

**Option A: Using Docker (Recommended)**

```bash
cd backend
docker-compose up -d
```

**Option B: Install Locally**

- Install PostgreSQL 15+ and create database `ai_automation`
- Install Redis 7+ and start it

### Step 3: Run Database Migrations

```bash
cd backend
npm run prisma:migrate
```

This will:
- Create the database schema
- Set up all tables

### Step 4: Start the Backend

```bash
npm run start:dev
```

The backend will be available at `http://localhost:3001/api/v1`

## Troubleshooting

### Error: DATABASE_URL not found
- Make sure `.env` file exists in `backend/` directory
- Check that the file is named exactly `.env` (not `.env.txt`)

### Error: Cannot connect to database
- Make sure PostgreSQL is running
- Check DATABASE_URL matches your PostgreSQL credentials
- Verify database `ai_automation` exists

### Error: Cannot connect to Redis
- Make sure Redis is running on port 6379
- Check REDIS_HOST and REDIS_PORT in `.env`

## Quick Start Script

On Windows PowerShell, you can create the `.env` file with:

```powershell
cd backend
@"
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ai_automation?schema=public"
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
JWT_EXPIRES_IN=7d
NODE_ENV=development
PORT=3001
API_PREFIX=api/v1
"@ | Out-File -FilePath .env -Encoding utf8
```

