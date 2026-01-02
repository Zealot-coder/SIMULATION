# Quick Start Guide

## ✅ Step 1: Environment File Created

The `.env` file has been created with default values.

## 📋 Next Steps

### Step 2: Start Database & Redis

You need PostgreSQL and Redis running. Choose one:

**Option A: Docker (Easiest)**
```powershell
cd backend
docker-compose up -d
```

**Option B: Manual Installation**
- Install PostgreSQL 15+ and create database `ai_automation`
- Install Redis 7+ and start it

### Step 3: Run Database Migrations

```powershell
cd backend
npm run prisma:migrate
```

This creates all the database tables.

### Step 4: Start Backend Server

```powershell
npm run start:dev
```

The backend will be available at: `http://localhost:3001/api/v1`

## 🔍 Verify Setup

1. Check PostgreSQL is running:
   ```powershell
   # Test connection (if psql is installed)
   psql -U postgres -h localhost -c "SELECT 1"
   ```

2. Check Redis is running:
   ```powershell
   # Test connection (if redis-cli is installed)
   redis-cli ping
   # Should return: PONG
   ```

3. Test backend health:
   ```powershell
   curl http://localhost:3001/api/v1/health
   ```

## ⚠️ Common Issues

### "Cannot connect to database"
- Make sure PostgreSQL is running
- Check the DATABASE_URL in `.env` matches your setup
- Create the database: `CREATE DATABASE ai_automation;`

### "Cannot connect to Redis"
- Make sure Redis is running on port 6379
- Check REDIS_HOST in `.env`

### "Prisma migration fails"
- Make sure database exists
- Check DATABASE_URL is correct
- Try: `npm run prisma:generate` first

## 🚀 Once Running

1. Backend: `http://localhost:3001/api/v1`
2. Frontend: `http://localhost:3000`
3. Test registration: `POST /api/v1/auth/register`

