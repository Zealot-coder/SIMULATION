# Supabase Server Integration

This project supports optional server-side Supabase access for dashboard and platform metrics.

Required environment variables (do NOT commit them to source):

- SUPABASE_URL - Your Supabase project URL (e.g., https://xyz.supabase.co)
- SUPABASE_SERVICE_ROLE_KEY - Service role key (server-only, **keep secret**)
- NEXT_PUBLIC_SUPABASE_URL - Public project URL for browser/SSR auth helpers
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY - Preferred public key for browser/SSR auth helpers
  - You can also use NEXT_PUBLIC_SUPABASE_ANON_KEY as a fallback

Notes:
- The server helper `lib/supabase-server.ts` will use the above env variables.
- `SUPABASE_URL` falls back to `NEXT_PUBLIC_SUPABASE_URL` if omitted.
- If the keys are missing or queries fail, endpoints will fall back to mock responses and include a `_warning` field in the JSON response.
- Do not expose `SUPABASE_SERVICE_ROLE_KEY` to the browser or client bundles.

How to enable:
1. Add the variables to your environment (e.g., CI or host machine). Do not modify the project `.env` files unless you manage secrets securely.
2. Restart the Next.js server.

Security:
- Use the service role key only on server-side code. Keep the key rotated and restricted where possible.
