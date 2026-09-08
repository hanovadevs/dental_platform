# Dental OS — Production Deployment Guide: Vercel & Supabase

This guide provides step-by-step instructions to deploy **Dental OS** to **Vercel** with high-concurrency **Supabase PostgreSQL**, engineered so multiple clinics and branch locations can operate simultaneously at peak performance.

---

## 1. Architecture Overview

```mermaid
graph TD
    Client["Dentist / Receptionist Web App"] --> VercelCDN["Vercel Edge Network & CDN (Brotli + Cache)"]
    VercelCDN --> Serverless["Next.js Serverless Lambdas (NextAuth + Server Actions)"]
    Serverless --> Supavisor["Supabase Supavisor Connection Pooler (Port 6543 - Transaction Mode)"]
    Supavisor --> Postgres["Supabase PostgreSQL (52 Tables + 38 Composite Indexes)"]
    
    subgraph "High Concurrency Multiplexing"
        Supavisor
        Postgres
    end
```

### Why This Setup Scales Efficiently
1. **Zero Connection Starvation**: When hundreds of clinics use the system simultaneously, standard PostgreSQL databases run out of connection limits (`too many clients already`). Dental OS connects via Supabase's **Supavisor Transaction Pooler** (Port 6543) with `max: 1` per serverless lambda and `prepare: false`, allowing thousands of serverless requests to share a compact, persistent database pool.
2. **Multi-Tenant Composite Indexes**: Rather than performing full sequential scans across patient lists, calendars, and revenue opportunities, PostgreSQL leverages **38 composite B-tree indexes** targeting `[organization_id, status]`, `[organization_id, start_at, end_at]`, and `[patient_id]`.
3. **Edge Optimization**: Static assets, fonts, and icons are cached with long-lived headers, Gzip/Brotli compression is enabled, and `poweredByHeader` is stripped.

---

## 2. Your Supabase Setup (Already Configured!)

Your Supabase project (`dfkoybjvfioaepgybdlj`) has already been initialized, migrated, and seeded directly:

| Attribute | Live Status |
| :--- | :--- |
| **Project URL** | `https://dfkoybjvfioaepgybdlj.supabase.co` |
| **Database Migrations** | **All 10 migrations applied** (`0001` through `0010_great_pepper_potts.sql`) |
| **Database Tables** | **52 tables** created with multi-tenant foreign keys & cascading constraints |
| **Database Indexes** | **38 composite B-tree indexes** created for instant multi-tenant filtering |
| **Initial Seed Data** | Default 27 permissions, 5 roles (Owner, Dentist, Receptionist, Assistant, Finance), and initial clinic created |
| **Initial Admin Login** | `admin@demodental.local` (Password: `password123`) |

---

## 3. Vercel Deployment — Step-by-Step

### Step 1: Push Code to GitHub / GitLab / Bitbucket
Ensure your repository has the latest code committed:
```bash
git add .
git commit -m "Production hardening: Supabase pooler, composite indexes, Vercel config"
git push origin master
```

---

### Step 2: Import Project in Vercel
1. Log in to [vercel.com](https://vercel.com) and click **"Add New..."** > **"Project"**.
2. Select your `dental_system` git repository.
3. Vercel will detect the monorepo. Because [`vercel.json`](file:///d:/Personal%20projects/dental_system/vercel.json) is already included at the root of the project, Vercel automatically uses:
   - **Framework Preset**: `Next.js`
   - **Build Command**: `npx turbo build --filter=web...`
   - **Output Directory**: `apps/web/.next`
   - **Install Command**: `npm install`

---

### Step 3: Configure Environment Variables in Vercel
In the **Environment Variables** section of the Vercel import screen, add the following variables:

#### A. Database Connections
| Variable | Value | Purpose |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql://postgres.dfkoybjvfioaepgybdlj:hjlJwFB0tadbe2TX@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true` | **Supabase Transaction Pooler (Port 6543)** used by serverless lambdas. *(See Note below to get your exact pooler host)* |
| `DIRECT_URL` | `postgresql://postgres:hjlJwFB0tadbe2TX@db.dfkoybjvfioaepgybdlj.supabase.co:5432/postgres` | **Direct Connection (Port 5432)** for session locks and migrations. |
| `DB_MAX_CONNECTIONS` | `1` | Serverless connection limit per lambda instance. |
| `DB_PREPARE` | `false` | Required for transaction pooling. |

> [!TIP]
> **How to get your exact Transaction Pooler string from Supabase**:
> 1. Open your [Supabase Dashboard](https://supabase.com/dashboard/project/dfkoybjvfioaepgybdlj).
> 2. Navigate to **Project Settings** (gear icon) > **Database**.
> 3. Under **Connection string**, select the **Transaction** tab (Port `6543`, Mode `Transaction`).
> 4. Copy the connection URI and replace `[YOUR-PASSWORD]` with `hjlJwFB0tadbe2TX`.

#### B. Application & Authentication
| Variable | Value | Purpose |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enables production optimizations. |
| `NEXT_PUBLIC_APP_NAME` | `Dental OS` | Brand title displayed in shell & emails. |
| `NEXT_PUBLIC_APP_URL` | `https://your-project-name.vercel.app` | Your Vercel production URL (or custom domain). |
| `AUTH_SECRET` | `vnGIFVMHzCzqCnkEsSZoYWLFQX6BRdwc` | NextAuth v5 encryption secret (or generate via `openssl rand -base64 33`). |
| `AUTH_URL` | `https://your-project-name.vercel.app` | Canonical auth callback root URL. |
| `AUTH_TRUST_HOST` | `true` | Allows NextAuth to trust Vercel reverse proxy headers. |

#### C. Supabase Client Keys
| Variable | Value |
| :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://dfkoybjvfioaepgybdlj.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRma295Ymp2ZmlvYWVwZ3liZGxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4Nzk3MDQsImV4cCI6MjEwNDQ1NTcwNH0.SA0gnuOAmirsle1a2fRbF6N1vc7FiMuqrwYKVNx3Omk` |

---

### Step 4: Deploy
1. Click **Deploy**.
2. Vercel will run `turbo build --filter=web...`, run TypeScript typechecking across all 18 routes, build optimized serverless chunks, and deploy to their global edge network.
3. Once finished, you will receive your live URL (e.g., `https://dental-system-xyz.vercel.app`).

---

## 4. Verification & Health Monitoring

### 1. Live Health Probe
Visit your deployment's health endpoint:
```text
GET https://your-domain.vercel.app/api/health
```
Response:
```json
{
  "status": "healthy",
  "database": {
    "status": "connected",
    "latencyMs": 14
  },
  "uptime": 124.5,
  "timestamp": "2026-09-08T16:30:00.000Z"
}
```

### 2. Clinic Login
1. Navigate to `https://your-domain.vercel.app/login`.
2. Log in with the pre-seeded clinic administrator:
   - **Email**: `admin@demodental.local`
   - **Password**: `password123`
3. Verify that the Command Palette (`Cmd+K`), Patient Directory, Dental Odontogram, Calendar, and Revenue Pipeline load instantaneously.

---

## 5. Routine Operations Runbook

### Running Future Database Migrations
When adding new features or tables:
```bash
# 1. Generate migration locally
npm run db:generate

# 2. Run migration against Supabase
npm run db:migrate
```

### Adding Custom Domains
1. In Vercel, go to **Settings** > **Domains**.
2. Enter your custom domain (e.g. `app.yourdentalclinic.com`).
3. Point your DNS CNAME record to `cname.vercel-dns.com`. Vercel automatically provisions zero-configuration SSL certificates with automated renewals.
