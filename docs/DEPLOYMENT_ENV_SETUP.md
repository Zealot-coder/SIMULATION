# Deployment Env Setup (Vercel + Backend)

This project has two runtime environments and two template files.

## 1) What each env file is for

1. `backend/.env`
   Local backend runtime only (`cd backend && npm run start:dev`).
2. `.env.local`
   Local frontend runtime only (`npm run dev` at repo root).
3. `backend/.env.production.example`
   Template for production backend values.
4. `.env.production.example`
   Template for production frontend (Vercel) values.

Use templates as references. Real production secrets belong in platform dashboards, not committed files.

## 2) Local development values

### Backend local (`backend/.env`)

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5434/ai_automation?schema=public
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
JWT_SECRET=<local-secret>
JWT_EXPIRES_IN=7d
NODE_ENV=development
PORT=3001
API_PREFIX=api/v1
FRONTEND_URL=http://localhost:3000
GOOGLE_CLIENT_ID=<optional-local-oauth-id>
GOOGLE_CLIENT_SECRET=<optional-local-oauth-secret>
GOOGLE_CALLBACK_URL=http://localhost:3001/api/v1/auth/google/callback
GITHUB_CLIENT_ID=<optional-local-oauth-id>
GITHUB_CLIENT_SECRET=<optional-local-oauth-secret>
GITHUB_CALLBACK_URL=http://localhost:3001/api/v1/auth/github/callback
```

### Frontend local (`.env.local`)

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<local-secret>
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
API_URL=http://localhost:3001/api/v1
GOOGLE_CLIENT_ID=<optional-local-oauth-id>
GOOGLE_CLIENT_SECRET=<optional-local-oauth-secret>
GITHUB_ID=<optional-local-oauth-id>
GITHUB_SECRET=<optional-local-oauth-secret>
```

## 3) Production values

### Frontend production (Vercel Project -> Settings -> Environment Variables)

```env
NEXTAUTH_URL=https://<your-vercel-domain>
NEXTAUTH_SECRET=<strong-random-secret>
NEXT_PUBLIC_API_URL=https://<your-backend-domain>/api/v1
API_URL=https://<your-backend-domain>/api/v1
GOOGLE_CLIENT_ID=<google-client-id>
GOOGLE_CLIENT_SECRET=<google-client-secret>
GITHUB_ID=<github-client-id>
GITHUB_SECRET=<github-client-secret>
```

### Backend production (your backend host env settings)

```env
DATABASE_URL=postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require
DIRECT_URL=postgresql://postgres.<project-ref>:<password>@db.<project-ref>.supabase.co:5432/postgres?sslmode=require
FRONTEND_URL=https://<your-vercel-domain>
JWT_SECRET=<strong-random-secret>
JWT_EXPIRES_IN=7d
NODE_ENV=production
PORT=3001
API_PREFIX=api/v1
GOOGLE_CLIENT_ID=<optional-if-using-backend-oauth-routes>
GOOGLE_CLIENT_SECRET=<optional-if-using-backend-oauth-routes>
GOOGLE_CALLBACK_URL=https://<your-backend-domain>/api/v1/auth/google/callback
GITHUB_CLIENT_ID=<optional-if-using-backend-oauth-routes>
GITHUB_CLIENT_SECRET=<optional-if-using-backend-oauth-routes>
GITHUB_CALLBACK_URL=https://<your-backend-domain>/api/v1/auth/github/callback
```

## 4) Where to get each required value

### Supabase `DATABASE_URL`

1. Open Supabase dashboard.
2. Select project.
3. Go to `Project Settings -> Database`.
4. Open `Connection string`.
5. Copy `URI` for runtime pooler (`pooler.supabase.com:6543`) and set it as `DATABASE_URL`.
6. Copy `URI` for direct connection (`db.<project-ref>.supabase.co:5432`) and set it as `DIRECT_URL`.

### Run migrations on the backend host

After setting `DIRECT_URL` on your backend host, run Prisma migrations once:

```bash
npx prisma migrate deploy
```

For Render, you can append it to your build command:

```bash
npm install --include=dev && npm run build && npx prisma migrate deploy
```

### Secrets (`NEXTAUTH_SECRET`, `JWT_SECRET`)

Generate with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Generate one for NextAuth and another for backend JWT.

### Vercel domain (`NEXTAUTH_URL`)

1. Open Vercel dashboard.
2. Select project.
3. Go to `Settings -> Domains`.
4. Use your primary domain in `NEXTAUTH_URL`.

### Google OAuth values

1. Open Google Cloud Console.
2. Go to `APIs & Services -> Credentials`.
3. Create or edit OAuth 2.0 Client ID (`Web application`).
4. Add authorized redirect URIs:
   `http://localhost:3000/api/auth/callback/google`
   `https://<your-vercel-domain>/api/auth/callback/google`
5. Copy Client ID and Client Secret to Vercel env vars.

### GitHub OAuth values

1. Open GitHub.
2. Go to `Settings -> Developer settings -> OAuth Apps`.
3. Create or edit the app.
4. Set callback URLs:
   `http://localhost:3000/api/auth/callback/github`
   `https://<your-vercel-domain>/api/auth/callback/github`
5. Copy Client ID and Client Secret to Vercel env vars (`GITHUB_ID`, `GITHUB_SECRET`).

## 5) Deployment order

1. Deploy backend first.
2. Confirm backend responds at `https://<your-backend-domain>/api/v1/health`.
3. Add Vercel env vars and redeploy frontend.
4. Confirm providers endpoint `https://<your-vercel-domain>/api/auth/providers`.
5. Test credential login and OAuth login.

## 6) Common mistakes to avoid

1. Using `localhost` values in production.
2. Missing `API_URL` in Vercel (server auth can fail).
3. Setting backend `FRONTEND_URL` to the wrong domain.
4. Forgetting to redeploy after changing env vars.
