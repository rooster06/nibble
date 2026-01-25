# Developer TODO

## Supabase Auth Setup (In Progress)

The code for Supabase authentication has been implemented. Complete these manual steps to finish the setup:

### 1. Create Supabase Project
- [ ] Go to https://supabase.com and sign up/login
- [ ] Click "New Project" → name it `nibble`
- [ ] Select region closest to you (e.g., `us-east-1`)
- [ ] Wait ~2 minutes for project to be ready

### 2. Get Your Credentials
After project is ready, go to **Project Settings > API**:
- [ ] Copy **Project URL** (e.g., `https://xxxxx.supabase.co`)
- [ ] Copy **anon public key** (starts with `eyJ...`)
- [ ] Click "Reveal" under JWT Settings and copy **JWT Secret**

### 3. Create Database Tables
Go to **SQL Editor** in Supabase dashboard and run:

```sql
-- Allowlist table
CREATE TABLE allowed_users (
  email TEXT PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE allowed_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own entry" ON allowed_users
  FOR SELECT USING (auth.jwt() ->> 'email' = email);

CREATE POLICY "Admins can read all" ON allowed_users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM allowed_users
      WHERE email = auth.jwt() ->> 'email' AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert" ON allowed_users
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM allowed_users
      WHERE email = auth.jwt() ->> 'email' AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete" ON allowed_users
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM allowed_users
      WHERE email = auth.jwt() ->> 'email' AND role = 'admin'
    )
  );

-- Access requests table
CREATE TABLE access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can request access" ON access_requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can see own request" ON access_requests
  FOR SELECT USING (auth.jwt() ->> 'email' = email);

CREATE POLICY "Admins can see all requests" ON access_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM allowed_users
      WHERE email = auth.jwt() ->> 'email' AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update requests" ON access_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM allowed_users
      WHERE email = auth.jwt() ->> 'email' AND role = 'admin'
    )
  );

-- ADD YOURSELF AS ADMIN (replace with your email)
INSERT INTO allowed_users (email, role) VALUES ('YOUR_EMAIL@example.com', 'admin');
```

### 4. Configure Supabase Auth Settings
In Supabase dashboard:
- [ ] Go to **Authentication > Providers**
- [ ] Enable **Email** provider
- [ ] Go to **Authentication > URL Configuration**
- [ ] Set **Site URL** to your frontend URL (e.g., `http://localhost:3000` for dev)
- [ ] Add **Redirect URL**: `http://localhost:3000/auth/callback`
- [ ] For production, add: `https://your-app.vercel.app/auth/callback`

### 5. Set Environment Variables

**Frontend** - Create `apps/web/.env.local`:
```
NEXT_PUBLIC_API_URL=https://xxx.execute-api.us-east-1.amazonaws.com/prod
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

**Terraform** - Add to `infra/terraform.tfvars`:
```
supabase_jwt_secret = "your-jwt-secret-from-supabase"
```

### 6. Install Dependencies & Deploy - DONE
```bash
# Install frontend dependencies
cd apps/web
pnpm install

# Rebuild Lambda layer (includes PyJWT now)
cd ../../services/api
./build.sh

# Deploy infrastructure
cd ../../infra
terraform apply
```

### 7. Test the Auth Flow
- [ ] Visit `/` → should redirect to `/login`
- [ ] Enter your admin email → receive magic link
- [ ] Click link → should redirect to app
- [ ] Try with non-allowed email → should see `/not-allowed`
- [ ] Test access request flow
- [ ] Visit `/admin` as admin → manage users

---

## What Was Implemented

### Frontend Files Created
- `lib/supabase/client.ts` - Browser Supabase client
- `lib/supabase/server.ts` - Server Supabase client
- `lib/supabase/middleware.ts` - Session utilities
- `lib/auth/AuthContext.tsx` - Auth state provider
- `app/login/page.tsx` - Magic link login
- `app/auth/callback/route.ts` - OAuth callback
- `app/not-allowed/page.tsx` - Access restricted page
- `app/admin/page.tsx` - Admin dashboard
- `middleware.ts` - Route protection

### Backend Files Created
- `lib/auth.py` - JWT verification decorator

### Files Modified
- `apps/web/package.json` - Added Supabase packages
- `apps/web/app/layout.tsx` - Added AuthProvider
- `apps/web/lib/api.ts` - Added auth headers
- `services/api/requirements.txt` - Added PyJWT
- `services/api/handlers/*.py` - Added @require_auth to all handlers
- `infra/variables.tf` - Added supabase_jwt_secret
- `infra/lambda.tf` - Added SUPABASE_JWT_SECRET to all Lambdas
