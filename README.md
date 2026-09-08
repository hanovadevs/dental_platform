# Dental Revenue OS

A multi-tenant dental practice management and revenue recovery platform.

## Architecture

- **Modular monolith** — Turborepo with `apps/web` (Next.js) and `packages/db` (Drizzle ORM)
- **Multi-tenant** — Organization-based tenancy with server-side permission enforcement
- **TypeScript strict mode** across all packages

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 18 (local) or Supabase (production)

### Setup

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local
# Edit .env.local with your database credentials

# Create database
createdb dental_dev

# Run migrations
npm run db:migrate

# Seed demo data
npm run db:seed

# Start development server
npm run dev
```

### Project Structure

```
dental-system/
├── apps/web/           # Next.js application
│   ├── src/app/        # Pages (App Router)
│   ├── src/components/ # Shared UI components
│   ├── src/features/   # Domain feature modules
│   ├── src/lib/        # Shared utilities
│   └── src/styles/     # Design system
├── packages/db/        # Database schema, migrations, seeds
└── docs/               # Product specifications
```

### Testing

```bash
npm run test
```

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js, TypeScript, React, Tailwind CSS |
| Backend | Next.js Server Actions |
| Database | PostgreSQL, Drizzle ORM |
| Auth | Auth.js (NextAuth v5) |
| Testing | Vitest |

## Documentation

See the `docs/` directory for complete product specifications.
