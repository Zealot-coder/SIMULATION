# OAuth Setup Guide (Google & GitHub)

## 🔐 Setting Up OAuth Providers

### Google OAuth Setup

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Create a new project or select existing one

2. **Enable Google+ API**
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API" and enable it

3. **Create OAuth 2.0 Credentials**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Application type: "Web application"
   - Authorized redirect URIs:
     ```
     http://localhost:3001/api/v1/auth/google/callback
     ```
   - For production, add your production URL

4. **Copy Credentials**
   - Copy the Client ID and Client Secret
   - Add to `.env` file:
     ```env
     GOOGLE_CLIENT_ID=your-client-id-here
     GOOGLE_CLIENT_SECRET=your-client-secret-here
     GOOGLE_CALLBACK_URL=http://localhost:3001/api/v1/auth/google/callback
     ```

### GitHub OAuth Setup

1. **Go to GitHub Settings**
   - Visit: https://github.com/settings/developers
   - Click "New OAuth App"

2. **Create OAuth App**
   - Application name: "AI Automation Platform"
   - Homepage URL: `http://localhost:3000` (or your frontend URL)
   - Authorization callback URL:
     ```
     http://localhost:3001/api/v1/auth/github/callback
     ```
   - Click "Register application"

3. **Copy Credentials**
   - Copy the Client ID
   - Generate a new Client Secret
   - Add to `.env` file:
     ```env
     GITHUB_CLIENT_ID=your-client-id-here
     GITHUB_CLIENT_SECRET=your-client-secret-here
     GITHUB_CALLBACK_URL=http://localhost:3001/api/v1/auth/github/callback
     ```

### Frontend URL

Make sure to set the frontend URL in `.env`:

```env
FRONTEND_URL=http://localhost:3000
```

## 🚀 How It Works

1. User clicks "Sign in with Google" or "Sign in with GitHub"
2. Redirects to OAuth provider (Google/GitHub)
3. User authorizes the application
4. Provider redirects back to backend callback URL
5. Backend creates/updates user and generates JWT token
6. Backend redirects to frontend with token
7. Frontend stores token and redirects to dashboard

## 📝 Environment Variables

Add these to `backend/.env`:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3001/api/v1/auth/google/callback

# GitHub OAuth
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_CALLBACK_URL=http://localhost:3001/api/v1/auth/github/callback

# Frontend URL (for redirects)
FRONTEND_URL=http://localhost:3000
```

## ✅ Testing

1. Start backend: `npm run start:dev`
2. Start frontend: `npm run dev`
3. Visit `/login` or `/signup`
4. Click "Sign in with Google" or "Sign in with GitHub"
5. Complete OAuth flow
6. Should redirect to dashboard

## 🔒 Security Notes

- Never commit OAuth secrets to git
- Use environment variables for all credentials
- For production, use HTTPS URLs
- Update callback URLs for production environment

