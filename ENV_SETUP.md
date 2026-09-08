# Environment Setup Guide

## Overview
The current production app uses Convex for authentication and application data. The Supabase instructions later in this document are retained as legacy migration notes and are not required by the current frontend.

## Current Convex Auth setup

Set the deployment URL in the frontend environment:

```env
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
```

Convex Auth OAuth callback URLs for the current production deployment are:

- Google: `https://savory-mallard-562.convex.site/api/auth/callback/google`

Register the exact callback URL with Google, then set the credentials on the production Convex deployment. Do not put these values in `NEXT_PUBLIC_*` variables or in browser code:

```bash
npx convex env set AUTH_GOOGLE_ID "your-google-client-id" --prod
npx convex env set AUTH_GOOGLE_SECRET "your-google-client-secret" --prod
```

Google sign-ins with an exact verified email are linked to an existing native Convex user. Duplicate native accounts are audited and consolidated only through the protected migration operation.

## Required Environment Variables

### Supabase Configuration

1. **NEXT_PUBLIC_SUPABASE_URL**
   - Your Supabase project URL
   - Format: `https://[project-id].supabase.co`
   - Found in: Supabase Dashboard → Settings → API

2. **NEXT_PUBLIC_SUPABASE_ANON_KEY**
   - Public anonymous key for client-side operations
   - Found in: Supabase Dashboard → Settings → API → `anon` key
   - Used for browser requests

3. **SUPABASE_SERVICE_ROLE_KEY**
   - Service role key for server-side operations
   - Found in: Supabase Dashboard → Settings → API → `service_role` key
   - ⚠️ Keep this secret - never expose in frontend code

4. **NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL** (Development)
   - Callback URL for authentication
   - Development: `http://localhost:3000/auth/callback`
   - Production: `https://your-domain.com/auth/callback`

### AI Service Configuration

The platform uses Vercel AI Gateway by default (recommended). No additional configuration needed - the AI Gateway supports:
- OpenAI (GPT-4, GPT-4 Turbo)
- Anthropic (Claude)
- Google Vertex
- AWS Bedrock
- And more...

## Step-by-Step Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in project details:
   - **Name**: `mwalimu-ai` (or your choice)
   - **Database Password**: Create a strong password
   - **Region**: Select closest to Kenya (e.g., Europe-West or Africa regions)
5. Wait for project to initialize (5-10 minutes)

### 2. Get Supabase Credentials

1. In Supabase Dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role secret** → `SUPABASE_SERVICE_ROLE_KEY`

### 3. Create .env.local File

In your project root, create `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Development only - set to production URL when deploying
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=http://localhost:3000/auth/callback
```

### 4. Set Up Database Tables

Choose one method:

**Option A: Supabase Dashboard (Recommended for beginners)**
1. In Supabase, go to **SQL Editor**
2. Click **New Query**
3. Copy entire contents of `/scripts/001_create_tables.sql`
4. Paste into editor and click **Run**
5. Tables are created with RLS policies

**Option B: Python Script**
```bash
cd scripts
python setup-db.py
```

**Option C: During App Launch**
Tables will be auto-created on first access (if using app-side setup)

### 5. Enable Email Confirmation (Optional)

For production, enable email verification:

1. Go to **Authentication** → **Providers**
2. Enable **Email** provider
3. Go to **Auth Templates** 
4. Customize confirmation email template
5. Users will need to confirm emails before accessing app

### 6. Configure Production Variables

When deploying to production:

1. Go to your hosting platform (Vercel/Netlify/etc.)
2. Set environment variables:
   - Same variables as `.env.local`
   - Update `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL` to your production domain
3. Deploy the app

## Verifying Configuration

### Test Supabase Connection

Add this to `/app/page.tsx` temporarily:

```typescript
'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function TestPage() {
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Session:', session)
    })
  }, [])

  return <div>Check browser console for session info</div>
}
```

### Test AI Chat

1. Navigate to `/dashboard/ai-coach` (after logging in)
2. Type a test message
3. Verify response appears
4. Check browser console for errors

## Troubleshooting

### "Failed to fetch" or Connection Errors

1. ✅ Verify Supabase URL is correct (no trailing slashes)
2. ✅ Check ANON key is actually the public key (short string)
3. ✅ Ensure `.env.local` is in root directory
4. ✅ Restart dev server after changing env vars

### "Unauthorized" or 403 Errors

1. ✅ Check SERVICE_ROLE_KEY is correct (long string)
2. ✅ Verify RLS policies are enabled
3. ✅ Ensure database tables exist
4. ✅ Check user authentication status

### Authentication Not Working

1. ✅ Verify redirect URL matches exactly
2. ✅ For local dev: `http://localhost:3000/auth/callback`
3. ✅ Check `/app/auth/callback/route.ts` exists
4. ✅ Look for errors in browser console

### AI Chat Returns Errors

1. ✅ Verify `/api/chat` route exists
2. ✅ Check OpenAI/Vercel AI Gateway is accessible
3. ✅ Ensure chat messages format is correct
4. ✅ Check API response in Network tab

## Security Best Practices

1. **Never Commit Secrets**
   - Add `.env.local` to `.gitignore`
   - Use different keys for dev/prod
   - Rotate keys regularly

2. **Protect Service Role Key**
   - Only use on backend (server components/API routes)
   - Never expose in client-side code
   - Delete if accidentally exposed

3. **Enable RLS**
   - All tables should have RLS enabled
   - Policies should restrict users to their own data
   - Test policies in Supabase before production

4. **Use HTTPS**
   - Always use HTTPS in production
   - Supabase enforces HTTPS by default

5. **Monitor Usage**
   - Check Supabase dashboard for unusual activity
   - Set up billing alerts if using paid tier
   - Review authentication logs regularly

## Performance Optimization

### Supabase Configuration
- Set appropriate region close to users
- Enable connection pooling for high traffic
- Use read replicas for scaling

### AI Gateway
- The Vercel AI Gateway handles rate limiting
- Monitor token usage in Vercel dashboard
- Consider model selection for cost vs. performance

## Upgrading

### Supabase
- Free tier supports basic usage
- Pay-as-you-go for production workloads
- No downtime for tier changes

### AI Services
- Vercel AI Gateway pricing based on usage
- Consider caching responses for frequently asked questions
- Monitor costs in Vercel dashboard

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Vercel AI Gateway Docs](https://sdk.vercel.ai)
- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [Authentication Best Practices](https://owasp.org/www-project-authentication-cheat-sheet/)

## Support

For configuration issues:
1. Check the troubleshooting section above
2. Review Supabase documentation
3. Check Vercel AI Gateway status
4. Contact support@mwalimuai.com

---

**Last Updated**: April 2026
