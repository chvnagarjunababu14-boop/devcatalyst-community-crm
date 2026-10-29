# DevCatalyst Hub — Database Migrations

This directory contains versioned SQL migrations for DevCatalyst Hub's PostgreSQL database on InsForge.

## Migration Sequence

All migrations are designed to be idempotent and must be applied strictly in ascending numerical order:

| Migration | Title | Purpose |
| :--- | :--- | :--- |
| `001_initial_schema.sql` | Foundation Schema | Defines `profiles`, `user_roles`, `projects`, `project_members`, and `tasks` with foreign keys, indexes, and assignee validation triggers. |
| `002_row_level_security.sql` | Row-Level Security | Enables RLS on all foundation tables, establishes helper function `public.has_role()`, and configures least-privilege policies. |
| `003_bootstrap_admin.sql` | Admin Bootstrapping | Defines the `bootstrap_initial_admin(email)` procedure for securely establishing the first system administrator without privilege escalation. |
| `004_project_code_and_permissions.sql` | Code Gen & Permissions | Safe sequential PRJ/TSK code generation and strict VIEWER task modification restrictions. |
| `005_events_and_registrations.sql` | Events & Attendance | Defines `events`, `registrations`, and `attendance` tables, atomic capacity reservation RPC `register_for_event`, ticket verification RPC `verify_and_checkin_ticket`, and QR scanning security. |
| `006_recruitment_and_members.sql` | Recruitment & CRM | Defines `recruitment_cycles`, `applications`, `application_interviews`, `application_scorecards`, and `member_metadata` tables with stage transitions, secure reference tracking, and onboarding stored procedure `onboard_candidate_to_member`. |
| `007_security_hardening.sql` | Security Hardening | Closes search-path hijacking risks by setting explicit `search_path = public, pg_temp` on `SECURITY DEFINER` functions, revokes direct public insert on `applications` (funneled exclusively through `submit_recruitment_application`), tightens member metadata modification to `ADMIN`/`ORGANIZER`, and establishes `member_directory_view` with column-level phone masking. |
| `008_public_projects_and_discovery.sql` | Public Discovery | Adds `is_public` boolean column to `public.projects`, establishes RLS policy for anonymous discovery on the homepage (`status IN ('ACTIVE', 'COMPLETED')`), and indexes public initiatives. *Note: Data updates setting existing projects to public must be explicitly approved by project leads/administrators.* |
| `009_notifications_and_automation.sql` | Notifications & Event Automation | Defines `public.notifications` table for event RSVP and recruitment email auditing, unique idempotency keys, delivery attempt states (`PENDING`, `SENT`, `FAILED`, `RETRYABLE`), and RLS access controls. |

---

## Applying Migrations

### Option A: Using InsForge CLI (Cloud or Local Instance)
Once your environment is linked (`npx @insforge/cli link`):

```bash
# Apply in strict dependency order:
npx @insforge/cli db query "$(cat migrations/001_initial_schema.sql)"
npx @insforge/cli db query "$(cat migrations/002_row_level_security.sql)"
npx @insforge/cli db query "$(cat migrations/003_bootstrap_admin.sql)"
npx @insforge/cli db query "$(cat migrations/004_project_code_and_permissions.sql)"
npx @insforge/cli db query "$(cat migrations/005_events_and_registrations.sql)"
npx @insforge/cli db query "$(cat migrations/006_recruitment_and_members.sql)"
npx @insforge/cli db query "$(cat migrations/007_security_hardening.sql)"
npx @insforge/cli db query "$(cat migrations/008_public_projects_and_discovery.sql)"
npx @insforge/cli db query "$(cat migrations/009_notifications_and_automation.sql)"
```

### Option B: Using Direct PostgreSQL Connection (`psql`)
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

## Bootstrapping the First Administrator

To prevent arbitrary privilege escalation:
1. Public registration (`/register`) **only** grants the `MEMBER` or `PARTICIPANT` role.
2. The initial administrator signs up through standard registration (e.g. `admin@devcatalyst.club`).
3. An authorized database operator runs:
   ```sql
   SELECT public.bootstrap_initial_admin('admin@devcatalyst.club');
   ```
4. **Safety Guarantee:** The function will reject execution if any administrator already exists in the database. Subsequent admins must be designated through the administrative interface.
