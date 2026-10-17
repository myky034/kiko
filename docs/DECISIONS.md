# Kiko — Decision Register

**Updated:** 2026-10-17 · **Scope:** decisions that change scope, security, architecture or cost.

Status values: **Accepted** (approved by the project owner), **Derived** (implementation choice made within an accepted decision; reviewable and reversible), **Open** (not decided; do not assume), **Deferred** (intentionally postponed). Proposals in other documents stay proposals until listed here as Accepted.

## Accepted and derived decisions

| ID | Decision | Status | Date | Source / evidence |
|---|---|---|---|---|
| DEC-001 | Authentication: **Supabase Auth, sign-in with an email OTP code** (no password, no magic-link callback). Spec D02. | Accepted | 2026-10-17 | Owner decision, slice 1 |
| DEC-002 | Private admission: an Owner/operator approves an email **before** first use. No public sign-up and no access-request screen in slice 1. A provider identity alone grants no Kiko access. The first visitor never becomes Owner; the first Owner is admitted through the operator script. | Accepted | 2026-10-17 | Owner decision; ACCESS_CONTROL §3, §9.1 |
| DEC-003 | Onboarding collects **learning languages and timezone only**. Learning goals are deferred. | Accepted | 2026-10-17 | Owner decision |
| DEC-004 | Development uses a **dedicated Supabase cloud project**. Production hosting is not chosen. | Accepted | 2026-10-17 | Owner decision |
| DEC-005 | **Prisma** owns the business schema and migrations; **SQL** for RLS, grants, CHECK constraints and functions, versioned as hand-written migrations in `prisma/migrations/` so one tool applies everything in order. Prisma 7.10.1 (the npm `latest` tag currently points to 8.0.0-rc, which is not used). | Accepted (tooling) / Derived (layout, version) | 2026-10-17 | Owner decision; ARCHITECTURE §9.1 |
| DEC-006 | Identity separation: web runtime connects as **`kiko_app`** (no LOGIN until an operator sets a password; NOBYPASSRLS; column-level grants) through the transaction pooler (`DATABASE_URL`, port 6543). Migrations and operator scripts use **`postgres`** through `DIRECT_URL`. The app refuses `postgres`, `supabase_admin` and `service_role` as runtime users. Tables live in schema `kiko`, which the Supabase Data API does not expose; `anon`, `authenticated` and `service_role` have no grants. | Derived | 2026-10-17 | `prisma/migrations/20261017000100_identity_security`; `tests/db` |
| DEC-007 | Admission runs inside `kiko.admit_identity()` / `kiko.is_email_admissible()` (SECURITY DEFINER, empty `search_path`, execute granted only to `kiko_app`). The runtime cannot read or write the allowlist, roles, account state or authorization revision. First admission also requires the provider to confirm the email (`getUser().email_confirmed_at`). | Derived | 2026-10-17 | `modules/identity/access.ts`; `tests/db`, `tests/unit/access.test.ts` |
| DEC-008 | UI: **Tailwind CSS only**, no component library; **system font stacks** with per-script fallbacks (no Inter download yet). | Accepted | 2026-10-17 | Owner decision |
| DEC-009 | Design tokens follow `docs/design-system.md` §2/§4. Where a brand value fails WCAG 2.2 AA, a `*-strong` variant is used for text and control borders: white on `primary` #7568DA = 4.42:1 → buttons use `primary-strong` #6254C7 (5.81:1); `warning` #B66A12 on white = 4.15:1 → text uses `warning-strong` #94560E (5.84:1); `border` #E7EAF2 = 1.20:1 → form controls use `border-strong` #8A93A6 (3.09:1 on surface). Visual identity overall remains Proposed (Spec D10). | Derived | 2026-10-17 | `app/globals.css`; ratios computed with the WCAG formula |
| DEC-010 | Learning languages stay **zh/ja/en**, matching the repository scope. | Accepted (scope kept) | 2026-10-17 | Owner decision; see OPEN-001 |
| DEC-011 | Sign-in sends a code only to approved emails (`shouldCreateUser: true` for those only) and returns the same response for every email, including on provider errors, so the form cannot enumerate approved addresses. | Derived | 2026-10-17 | `app/sign-in/actions.ts` |
| DEC-012 | Revocation: account state, roles and `authorization_revision` are read from the database on every protected request (no cross-request cache). Writes are guarded on `state = active` and the observed revision, so a suspension committed mid-request rejects the write. | Derived | 2026-10-17 | ACCESS_CONTROL §9.3; `tests/unit/onboarding-service.test.ts` |
| DEC-013 | `npm test` keeps database-level tests on **PGlite** (in-process PostgreSQL 18.x), so the default suite needs no database server. It verifies SQL semantics, constraints, grants and RLS — not Supabase parity (version 17.x, pooler, Auth, TLS). | Derived | 2026-10-17 | TEST_PLAN §2 |
| DEC-014 | Integration tests (`npm run test:integration`) run on the owner's **local Postgres.app 18.6**, database `kiko_flashcard`, via `KIKO_TEST_DATABASE_URL`. Each run drops schema `kiko` and `public._prisma_migrations` in that database only, applies migrations with `prisma migrate deploy`, and runs the Prisma repository with `current_user = kiko_app` via the startup parameter `options=-c role=kiko_app` (admin user must be a superuser or member of `kiko_app`). `kiko_app` stays NOLOGIN without a password locally, so an interrupted run leaves no credential behind (an earlier per-run-password design did, when interrupted with SIGINT; replaced). A guard refuses non-loopback hosts and URLs equal to `DATABASE_URL`/`DIRECT_URL`. Cluster roles `anon`, `authenticated`, `service_role` (NOLOGIN; created only if missing, never altered) and `kiko_app` (created by the migration) exist on the local server. PostgreSQL 18 vs Supabase 17 remains a version gap. | Accepted (database, version) / Derived (mechanics) | 2026-10-17 | Owner decision; `tests/integration` |

| DEC-015 | **Verified TLS for every remote database connection.** Supabase's pooler presents a certificate from Supabase's own CA (not in the system store), and `pg` uses no TLS by default. Runtime (`DATABASE_URL`, pg dialect): `sslmode=verify-full&sslrootcert=<CA path>`; Prisma CLI and operator scripts (`DIRECT_URL`, Prisma dialect): `sslmode=require&sslaccept=strict&sslcert=<CA path>`. Verified: Prisma with `sslmode=require` alone, or with `sslcert` but without `sslaccept=strict`, connected despite a wrong CA (no verification); with `sslaccept=strict` a wrong CA is rejected before authentication. The app, `prisma.config.ts` (for `migrate`/`db`) and both scripts refuse remote URLs without these parameters. Loopback hosts are exempt. | Derived | 2026-10-17 | `server/config/env.ts`, `prisma.config.ts`, `scripts/lib/db.mjs`; tests |
| DEC-016 | Migration `20261017000200_protect_migration_history` revokes the Supabase default grants on `public._prisma_migrations` from `anon`, `authenticated`, `service_role` and enables RLS, because `public` is exposed by the Data API and Supabase grants new `public` tables to those roles. | Derived | 2026-10-17 | Read-only review of `pg_default_acl` on the dev project; `tests/db`, `tests/integration` |
| DEC-017 | Runtime credential: `scripts/provision-runtime-role.mjs` generates the `kiko_app` password locally, sends only its SCRAM-SHA-256 verifier over verified TLS, checks the login through the transaction pooler and writes `DATABASE_URL` to `.env.local` (mode 600) without printing it. Re-running rotates the password. | Derived | 2026-10-17 | RFC 7677 vector test; local Postgres run |

## Open decisions

| ID | Question | Notes |
|---|---|---|
| OPEN-001 | Language scope vs design brief | `design-system.md` mentions Korean and French; the repository scope is zh/ja/en. No language added or removed. |
| OPEN-002 | Supabase "Allow new users to sign up" setting | Kept enabled so approved emails can receive a first code. Kiko access is still denied without admission, but anyone with the publishable key can create provider identities directly via the Auth API. Disabling it requires pre-creating provider users (admin API + service key), not implemented. |
| OPEN-003 | Database TLS rollout | Enforced in code (DEC-015) but needs the Supabase CA certificate on the operator machine and *Enforce SSL* enabled in the dashboard. Read-only probes on 2026-10-16/17 connected without TLS, so the `postgres` database password travelled unencrypted; rotating it after TLS is in place is recommended. |
| OPEN-004 | Owner administration UI | Admission/suspension via `scripts/kiko-admin.mjs` only. Role changes for existing accounts and last-Owner protection are not implemented. |
| OPEN-005 | Review rating scale | Spec FR09: 3 ratings; design-system: 4 ratings. Decide before KIKO-016. |
| OPEN-006 | Primary UI font | design-system proposes Inter; system fonts kept for now (DEC-008). |
| OPEN-007 | Production hosting, target devices, script variant, English accent | Spec D01, D03, D04, D07 remain open. |

## Change log

| Date | Change |
|---|---|
| 2026-10-17 | Register created for slice 1 (sign-in → admission → onboarding → dashboard). |
