# Authentication Success Runbook

This document explains the end-to-end authentication setup that is now working, including:

- tools and platforms used
- environment configuration
- database schema used by auth
- migration and repair steps applied
- credential and OAuth flows
- authorization and dashboard routing
- verification and troubleshooting playbook

## 1) Scope and architecture

Authentication in this project spans:

- Frontend: Next.js app with NextAuth (`app/`, `lib/auth.ts`, `contexts/auth-context.tsx`)
- Backend: NestJS auth APIs (`backend/src/auth/*`)
- Database: Supabase Postgres via Prisma (`backend/prisma/schema.prisma`)

High-level model:

1. Frontend UI calls backend auth endpoints (`/api/v1/auth/*`) for register/login/OAuth start.
2. Backend persists users/tokens in Postgres via Prisma.
3. NextAuth stores session/JWT on frontend side and handles protected route session state.
4. Middleware and guards enforce role-based access for dashboard routes.

## 2) Tools used

- Supabase dashboard: project URL, DB connection strings, SQL editor
- Prisma CLI:
  - `npx prisma migrate resolve`
  - `npx prisma migrate status`
  - `npx prisma migrate deploy`
- Render dashboard: backend env vars, build/start/pre-deploy commands, logs
- Vercel dashboard: frontend env vars and redeploy
- CLI verification:
  - `curl` / `Invoke-RestMethod`
  - `npm run build`

## 3) Environment variables required

### Backend (Render)

Use production values from `backend/.env.production.example`.

Required auth/database keys:

- `DATABASE_URL` (pooler, port `6543`)
- `DIRECT_URL` (migrations, direct DB or pooler `5432`)
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `FRONTEND_URL` (must match deployed frontend origin)
- OAuth keys if using backend OAuth routes:
  - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`
  - `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_CALLBACK_URL`

### Frontend (Vercel)

Use production values from `.env.production.example`.

Required:

- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `NEXT_PUBLIC_API_URL`
- `API_URL`

Recommended fallback:

- `NEXT_PUBLIC_API_FALLBACK_URL`

Optional for direct NextAuth OAuth mode:

- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_ID`, `GITHUB_SECRET`

## 4) Database schema used by authentication

Core Prisma models:

- `User`
  - `id`, `email`, `phone`, `password`
  - `firstName`, `lastName`, `name`, `avatar`
  - `role`, `isActive`, `lastLogin`, `createdAt`, `updatedAt`
- `RefreshToken`
  - `id`, `userId`, `token`, `expiresAt`, `isRevoked`, `createdAt`
- `OAuthAccount`
  - `id`, `userId`, `provider`, `providerAccountId`
  - `email`, `name`, `avatar`
  - `accessToken`, `refreshToken`, `expiresAt`, `createdAt`, `updatedAt`

Related authorization model:

- `OrganizationMember` is used for organization-level access checks.

Reference files:

- `backend/prisma/schema.prisma`
- `backend/src/auth/auth.service.ts`
- `backend/src/auth/strategies/google.strategy.ts`
- `backend/src/auth/strategies/github.strategy.ts`
- `backend/src/auth/strategies/jwt.strategy.ts`

## 5) What was fixed to make auth successful

### Fix A: Prisma migrations were not tracked in git

Problem:

- `backend/.gitignore` ignored `/prisma/migrations`, so deploys had no migration files.

Fix:

- Removed ignore rule and committed migration files.

### Fix B: `P3005` baseline error on existing non-empty DB

Problem:

- Prisma reported non-empty schema with no baseline migration history.

Fix:

- Marked initial migration as applied:

```bash
cd backend
npx prisma migrate resolve --applied 20260208225526_init_local
npx prisma migrate status
```

### Fix C: `FATAL: Tenant or user not found`

Problem:

- DB username used wrong project ref in connection URL.

Fix:

- Corrected username format in connection strings:
  - `postgres.<your-project-ref>`

### Fix D: Frontend could not reach backend API

Problem:

- `NEXT_PUBLIC_API_URL` sometimes missing or set to localhost in hosted environments.

Fix:

- Added production-safe API base fallback logic:
  - `lib/api-client.ts`
  - `lib/auth.ts`
- Updated auth pages to use resolved API base helper:
  - `app/auth/sign-in/page.tsx`
  - `app/auth/sign-up/page.tsx`

### Fix E: `Internal server error` during register/login

Problem:

- Production DB `User`/`OAuthAccount` columns did not fully match Prisma model (`name`, `avatar`, `lastLogin`, etc.).

Fix:

- Added and applied compatibility migration:
  - `backend/prisma/migrations/20260213130500_auth_schema_compat/migration.sql`

## 6) Deployment commands that work

### Render backend

- Build Command:

```bash
npm install --include=dev && npm run build
```

- Pre-Deploy Command:

```bash
npx prisma migrate deploy
```

- Start Command:

```bash
npm run start:prod
```

### Vercel frontend

- Set env vars from `.env.production.example`
- Redeploy after env changes

## 7) Authentication flow by process

### 7.1 Credential signup flow

1. User submits form in `app/auth/sign-up/page.tsx`.
2. Frontend calls backend `POST /api/v1/auth/register`.
3. Backend `AuthService.register()`:
   - checks duplicate email/phone
   - hashes password
   - creates `User`
   - creates `RefreshToken`
   - returns access token + refresh token + user profile
4. Frontend then signs into NextAuth credentials provider.
5. Redirect to `/auth/callback`, then role-based dashboard.

### 7.2 Credential login flow

1. User submits form in `app/auth/sign-in/page.tsx`.
2. NextAuth credentials provider in `lib/auth.ts` calls backend `POST /auth/login`.
3. Backend validates credentials, updates `lastLogin`, issues tokens.
4. NextAuth stores session/JWT.
5. Middleware redirects based on role to `/dev/overview` or `/app/overview`.

### 7.3 Refresh token flow

1. Client sends `POST /api/v1/auth/refresh`.
2. Backend validates refresh token record.
3. Old refresh token is revoked.
4. New access + refresh token pair is issued.

### 7.4 Logout flow

1. Client sends `POST /api/v1/auth/logout` with refresh token.
2. Backend marks refresh token revoked.
3. Frontend clears session via NextAuth sign-out.

### 7.5 OAuth flow (Google/GitHub)

1. User clicks provider button.
2. Frontend redirects to backend:
   - `/api/v1/auth/google`
   - `/api/v1/auth/github`
3. Strategy callback upserts `User` and links/updates `OAuthAccount`.
4. Backend callback redirects to frontend `/auth/callback` with tokens in query.
5. Frontend exchanges backend token through NextAuth `oauth-token` provider.
6. Frontend clears query params and routes user by role.

## 8) Authorization and dashboard routing

Role logic:

- Dev dashboard role check in frontend:
  - `OWNER` or `SUPER_ADMIN` -> `/dev/overview`
- App dashboard for other roles:
  - `/app/overview`

Important backend admin check:

- Admin API guard currently requires `OWNER` role.

Useful routes:

- Dev dashboard: `/dev/overview`
- Admin dashboard UI: `/admin`
- Backend admin users API: `/api/v1/admin/users`

## 9) Verification checklist

### Health and providers

```bash
curl -I https://simulation-cyww.onrender.com/api/v1/health
curl -I https://simulation-snowy-three.vercel.app/api/auth/providers
```

### Register and login smoke test

```bash
curl -X POST https://simulation-cyww.onrender.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123!","firstName":"Test","lastName":"User"}'

curl -X POST https://simulation-cyww.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123!"}'
```

Expected: both return tokens + user payload, no 500.

### Database migration status

```bash
cd backend
npx prisma migrate status
npx prisma migrate deploy
```

## 10) Troubleshooting map

- `P3005 database schema is not empty`
  - baseline migration with `migrate resolve --applied ...`
- `FATAL: Tenant or user not found`
  - fix DB username project ref in `DATABASE_URL`/`DIRECT_URL`
- `Unable to reach backend API`
  - verify `NEXT_PUBLIC_API_URL`, `API_URL`, CORS `FRONTEND_URL`, backend uptime
- `Internal server error` on auth endpoints
  - ensure compatibility migration applied and DB columns match Prisma auth model

## 11) Security notes

- Never commit real secrets (`.env` files remain local/hosted only).
- Rotate any credentials that were exposed in logs/chats/screenshots.
- Keep service-role keys server-side only.

## 12) Source files index

- Frontend auth:
  - `app/auth/sign-in/page.tsx`
  - `app/auth/sign-up/page.tsx`
  - `app/auth/callback/page.tsx`
  - `contexts/auth-context.tsx`
  - `lib/auth.ts`
  - `lib/api-client.ts`
  - `middleware.ts`
- Backend auth:
  - `backend/src/auth/auth.controller.ts`
  - `backend/src/auth/auth.service.ts`
  - `backend/src/auth/strategies/google.strategy.ts`
  - `backend/src/auth/strategies/github.strategy.ts`
  - `backend/src/auth/strategies/jwt.strategy.ts`
  - `backend/src/admin/guards/admin.guard.ts`
- Prisma:
  - `backend/prisma/schema.prisma`
  - `backend/prisma/migrations/20260208225526_init_local/migration.sql`
  - `backend/prisma/migrations/20260213130500_auth_schema_compat/migration.sql`
- Env templates:
  - `.env.production.example`
  - `backend/.env.production.example`
  - `docs/DEPLOYMENT_ENV_SETUP.md`

