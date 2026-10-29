# DevCatalyst Hub

> **Unified Project Management, Event CRM, Recruitment Pipeline & Community Directory for DevCatalyst Club.**

DevCatalyst Hub is an all-in-one platform built for student developer organizations. It unites collaboration across project tracking, Kanban boards, interactive event management, automated QR attendance verification, structured applicant review, and club member lifecycle CRM.

---

## 1. Architecture Overview

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, QRCode SVG engine.
- **Backend Infrastructure:** InsForge (PostgreSQL database with Row-Level Security, Auth, RPC functions, and Realtime).
- **Design System:** Custom token-based theme using verified slate/indigo palette, glassmorphism surfaces, accessible contrast, and zero layout shift.
- **Resilience Engine:** Dual-mode architecture featuring seamless local development mock engine and direct InsForge cloud persistence with production configuration diagnostics.

---

## 2. Environment Configuration

### Required Environment Variables

DevCatalyst Hub requires public InsForge credentials for browser-side database interactions. Copy `.env.example` to `.env.local` for local execution:

```bash
cp .env.example .env.local
```

| Variable | Description | Client Exposed | Example Format |
| :--- | :--- | :--- | :--- |
| `VITE_INSFORGE_URL` | InsForge project endpoint URL | Yes (`VITE_` prefix) | `https://xyzcompany.insforge.app` |
| `VITE_INSFORGE_ANON_KEY` | Public anonymous client API key | Yes (`VITE_` prefix) | `eyJhbGciOi...` |
| `VITE_APP_ENV` | Application environment identifier | Yes | `development` \| `staging` \| `production` |

> [!WARNING]
> **Zero Secrets in Browser Bundle**: NEVER put `INSFORGE_SERVICE_ROLE_KEY`, database passwords, or private signing keys in `.env`, `.env.local`, or any variable prefixed with `VITE_`. All browser requests must use the public anonymous key bounded strictly by PostgreSQL Row-Level Security (RLS).

---

## 3. Development vs. Production Modes

DevCatalyst Hub implements an explicit, non-silent environment isolation model in `src/lib/insforge.ts`:

- **Development Mode (`import.meta.env.DEV` or `VITE_APP_ENV=development`):**
  - If `VITE_INSFORGE_URL` and `VITE_INSFORGE_ANON_KEY` are unset, the app gracefully falls back to the in-memory mock engine with pre-seeded demo users, projects, tasks, events, and candidate applications.
  - A friendly badge (`DEV_FALLBACK`) indicates offline development status.
- **Production Mode (`import.meta.env.PROD` or `VITE_APP_ENV=production`):**
  - **No Silent Fallback:** If cloud credentials are missing in production, the application will **never** silently fall back to mock data. Instead, a critical diagnostic banner informs administrators: `CRITICAL CONFIGURATION ERROR: InsForge backend credentials missing`.

---

## 4. Local Setup & Quickstart

### Prerequisites
- Node.js `20.x` or higher
- npm `10.x` or higher

```bash
# 1. Clone repository
git clone https://github.com/devcatalyst-club/devcatalyst-hub.git
cd devcatalyst-hub

# 2. Install dependencies
npm install

# 3. Start local development server (with fallback data engine)
npm run dev

# App runs at http://localhost:5173
```

---

## 5. Connecting a Live InsForge Project & Running Migrations

To connect a live cloud database or staging instance:

1. Create a project at [InsForge Console](https://insforge.com).
2. Retrieve the **Project URL** and **Public Anon Key** from Settings > API.
3. Configure your `.env.local`:
   ```env
   VITE_INSFORGE_URL=https://your-project.insforge.app
   VITE_INSFORGE_ANON_KEY=your_public_anon_key_here
   VITE_APP_ENV=development
   ```
4. Apply the SQL migrations in strict ascending order from the `migrations/` directory:

| Sequence | Migration File | Description |
| :---: | :--- | :--- |
| **001** | `migrations/001_initial_schema.sql` | Profiles, user_roles, projects, project_members, tasks tables |
| **002** | `migrations/002_row_level_security.sql` | RLS enablement, `has_role()` helper, and least-privilege policies |
| **003** | `migrations/003_bootstrap_admin.sql` | `bootstrap_initial_admin(email)` idempotent procedure |
| **004** | `migrations/004_project_code_and_permissions.sql` | Sequential code generation RPCs and VIEWER task rules |
| **005** | `migrations/005_events_and_registrations.sql` | Events, registrations, atomic capacity RPC, attendance verification |
| **006** | `migrations/006_recruitment_and_members.sql` | Recruitment cycles, scorecards, member metadata, onboarding RPC |
| **007** | `migrations/007_security_hardening.sql` | `search_path` hijacking fixes, table ingestion locks, masked directory view |
| **008** | `migrations/008_public_projects_and_discovery.sql` | Public projects visibility column, discovery index, and RLS policy |

Apply via psql:
```bash
psql "$DATABASE_URL" -f migrations/001_initial_schema.sql
psql "$DATABASE_URL" -f migrations/002_row_level_security.sql
psql "$DATABASE_URL" -f migrations/003_bootstrap_admin.sql
psql "$DATABASE_URL" -f migrations/004_project_code_and_permissions.sql
psql "$DATABASE_URL" -f migrations/005_events_and_registrations.sql
psql "$DATABASE_URL" -f migrations/006_recruitment_and_members.sql
psql "$DATABASE_URL" -f migrations/007_security_hardening.sql
psql "$DATABASE_URL" -f migrations/008_public_projects_and_discovery.sql
```

---

## 6. Authentication & Initial Admin Bootstrapping

Public signup (`/register`) assigns only the `MEMBER` or `PARTICIPANT` role to prevent self-escalation.

To designate the initial system administrator:
1. Register the admin account via the UI (`http://localhost:5173/register`) with email `admin@devcatalyst.club`.
2. Connect to the database and invoke the bootstrapping procedure:
   ```sql
   SELECT public.bootstrap_initial_admin('admin@devcatalyst.club');
   ```
3. **Safety Protection:** This procedure will fail if an administrator already exists. Subsequent role updates can only be executed by an authenticated `ADMIN` through the Member CRM interface.

### Default Local Test Accounts (Development Mode Only)
When running in offline demo mode, the following credentials are pre-seeded:

| Email | Password | Role | Permissions |
| :--- | :--- | :--- | :--- |
| `admin@devcatalyst.club` | `password123` | `ADMIN`, `ORGANIZER` | Full system access, member role assignment, project deletion |
| `sarah.lead@devcatalyst.club` | `password123` | `PROJECT_LEAD`, `MEMBER` | Project editing, task assignment, candidate reviewer |
| `marcus.member@devcatalyst.club` | `password123` | `MEMBER` | Contributor/Viewer task updates, public registration |

---

## 7. Quality Checks & Verification

Run the test suite, build, and linter:

```bash
# Run Vitest test suite (120 tests across 9 suites)
npm run test

# Run Oxlint static analysis
npm run lint

# Compile TypeScript and build production bundle
npm run build

# Preview production build locally
npm run preview
```

---

## 8. Staging Deployment Checklist

Before promoting to a staging cloud environment:

- [ ] Set `VITE_APP_ENV=staging` in cloud environment variables.
- [ ] Connect strictly to the **Staging InsForge project** (verify project ID before deploying).
- [ ] Execute migrations `001` through `007` in dependency order against the staging database.
- [ ] Bootstrap the staging administrator via `SELECT public.bootstrap_initial_admin(...)`.
- [ ] Execute `npm run test` and `npm run build` in CI/CD pipeline (zero failures allowed).
- [ ] Test the 7 Persona Authorization Matrix (`Anonymous`, `Member`, `Contributor`, `Viewer`, `Lead`, `Organizer`, `Admin`).
- [ ] Verify event capacity constraints and concurrent ticket check-ins using disposable accounts.
- [ ] Verify applicant submission and reference code tracking without leaking scorecards or notes.

---

## 9. Backup, Rollback & Incident Recovery

- **Database Snapshots:** Enable daily automated WAL (write-ahead log) point-in-time recovery on InsForge.
- **Rollback Procedure:**
  - Migrations `001` through `007` are additive and non-destructive.
  - If a migration failure occurs, revert to the last stable snapshot before re-running the migration pipeline.
- **Incident Recovery:**
  - In the event of compromised credentials, immediately rotate the `VITE_INSFORGE_ANON_KEY` in the InsForge Console and redeploy the frontend bundle.
  - If unauthorized role modification is detected, query the `user_roles` audit log and revoke unauthorized privileges via the `ADMIN` dashboard.

---

## 10. Known Limitations

- **Calendar & Email Integrations:** Automated calendar invite (`.ics`) generation and transactional SMTP emails (e.g. ticket confirmations, interview invitations) are currently simulated client-side. Live SMTP requires configuring an external mail webhook provider.
- **Private File Uploads:** Candidate resume links currently accept verified external URLs (Google Drive, GitHub, LinkedIn). Direct file storage via private S3/InsForge buckets will be enabled in Phase 7.
