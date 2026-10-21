# Kiko

Personal language learning for **Chinese · Japanese · English**.

Kiko connects reading/listening content, vocabulary capture, shadowing, handwriting practice where supported, and review. The goal is a useful personal learning space with private data and controllable operating cost.

## Project status

**Slice 1 in progress — private sign-in → admission → onboarding → empty dashboard.** Implemented: Google sign-in through Supabase Auth, Owner-approved admission, OWNER/LEARNER permissions with ownership checks in the server DAL, onboarding (learning languages + timezone), an empty-state dashboard and the database schema/migrations. Not yet done against the cloud project: applying migrations, enabling the runtime role and a real Google sign-in (see [Supabase and database setup](#supabase-and-database-setup)). No lessons, vocabulary, storage, AI or deployment exist yet.

Accepted decisions are recorded in [docs/DECISIONS.md](docs/DECISIONS.md): Supabase Auth with Google OAuth, private admission, Prisma + SQL migrations, a dedicated Supabase dev project, Tailwind only, system fonts, zh/ja/en. Still proposed/open: target devices, hosting, Vietnamese UI as final, visual identity, storage provider.

## Planned MVP

- Sign in with an allowed personal account; registration not public by default.
- Create personal text/media lessons and import/edit timed subtitles.
- Select phrases, save vocabulary/readings and organize decks.
- Play/repeat sentences, adjust supported playback speed, record and compare takes.
- Practice supported Chinese/Japanese character strokes or free writing; no English stroke training implied.
- Review vocabulary and see actual progress per language.
- Export/restore learning data and recordings with ownership protection.

No pronunciation/handwriting scores, AI conversations, unrestricted URL import, full offline sync, classroom or payment features in the baseline MVP. AI is optional and disabled until deliberately integrated.

## Roles and privacy

`LEARNER` manages their own learning data. `OWNER` manages accounts, configuration and shared catalog. The initial personal account has both. Owner does not automatically read another learner's recordings/progress. Application permissions, ownership checks and database/storage policies enforce this; frontend hiding is not security.

## Documents

`AGENTS.md` and this README stay at the repository root; project documents live in `docs/`, grouped into `product/`, `research/`, `ux/` and `engineering/` (index: [docs/README.md](docs/README.md)):

| File | Purpose |
|---|---|
| [AGENTS.md](AGENTS.md) | Provider-neutral instructions for AI coding agents |
| [docs/README.md](docs/README.md) | Index of all project documents |
| [docs/product/PROJECT_SPEC.md](docs/product/PROJECT_SPEC.md) | Product scope and acceptance criteria |
| [docs/engineering/ARCHITECTURE.md](docs/engineering/ARCHITECTURE.md) | Modules, data flow, deployment and operational design |
| [docs/engineering/ACCESS_CONTROL.md](docs/engineering/ACCESS_CONTROL.md) | Roles, permissions, ownership and enforcement |
| [docs/ux/UI_SPEC.md](docs/ux/UI_SPEC.md) | Screens, interaction and responsive states |
| [docs/engineering/DATA_MODEL.md](docs/engineering/DATA_MODEL.md) | Entities, relations, constraints and retention |
| [docs/engineering/IMPLEMENTATION_PLAN.md](docs/engineering/IMPLEMENTATION_PLAN.md) | Ordered slices/tasks and completion gates |
| [docs/engineering/TEST_PLAN.md](docs/engineering/TEST_PLAN.md) | Tests, environments, release gates and evidence |
| [docs/ux/DESIGN.md](docs/ux/DESIGN.md) | “Quiet Bloom” UI spec: tokens, components, screens, states (in use, DEC-026) |
| [docs/ux/DESIGN_SYSTEM.md](docs/ux/DESIGN_SYSTEM.md) | Earlier “Soft Learning System” design system — superseded for visuals by DESIGN.md, kept for history |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Accepted, derived and open decisions |
| [.env.example](.env.example) | Configuration contract with placeholders |

Documents refer to each other by bare file name (e.g. `PROJECT_SPEC.md`); file names are unique across `docs/`, and [docs/README.md](docs/README.md) shows which folder each one is in. The spec's role section (§5) is aligned with ACCESS_CONTROL.md as of spec v1.1. ADR/decision records should distinguish Proposed, Accepted and Deferred choices.

## Getting started — documentation stage

1. Assemble the documents in the actual repository; keep `AGENTS.md` uppercase for tools that discover it by that convention.
2. Read AGENTS.md, the product spec, access control and implementation plan.
3. Resolve KIKO-001 decisions; run isolated media/writing/provider spikes in P0.
4. Choose stack versions, package manager, auth, storage and deployment boundaries.
5. Bootstrap application in KIKO-005 and replace the pending setup section below with verified commands.
6. Implement one slice at a time, starting with login → choose language → create text lesson → save word → reload.

If an agent does not load AGENTS.md automatically, explicitly ask it to read the file before work. Instructions are guidance; security still requires real code, policies and tests.

## Local application setup

Verified on macOS with Node.js 24.21.0 and npm 11.19.0 (2026-10-17).

| Item | Verified value |
|---|---|
| Runtime | Node.js `>=22.12.0` (`engines`; Vitest 5 requirement); `.nvmrc` pins major 24 |
| Package manager | npm, single `package-lock.json` |
| Install | `npm ci` |
| Development | `npm run dev` → http://localhost:8080 (runs `prisma generate` first; `PORT=… npm run dev` overrides) |
| Production build / serve | `npm run build`, then `npm start` → http://localhost:8080 (`PORT` overrides) |
| Lint | `npm run lint` (ESLint CLI with `eslint-config-next` core-web-vitals + TypeScript) |
| Typecheck | `npm run typecheck` (`prisma generate && next typegen && tsc --noEmit`; no database needed) |
| Tests | `npm test` (Vitest: unit, component and PGlite database tests; no network or secrets); `npm run test:watch` |
| Integration tests | `npm run test:integration` — local PostgreSQL via `KIKO_TEST_DATABASE_URL`; resets schema `kiko` in that database each run (DEC-014) |
| Migrations | `npm run db:migrate:status` (read-only), `npm run db:migrate:deploy` (writes; manual, needs approval) |
| Admission | `npm run kiko:admin -- <status\|admit\|revoke\|suspend\|reactivate> --email …` |
| Runtime credential | `npm run db:provision-runtime -- --yes` (creates/rotates the `kiko_app` password; approval) |
| Sample lessons | `npm run kiko:seed-samples -- --email <learner email> --yes` — zh/ja/en samples for one signed-in Learner; re-run skips existing (DEC-025; approval for shared databases) |
| E2E | Not set up yet |

```bash
nvm use        # optional, reads .nvmrc
npm ci
npm run dev
```

`lint`, `typecheck`, `test` and `build` need no environment variables. Running the app needs the Supabase/database variables below; without them protected pages fail closed with an error screen. Do not run migrations/seeds against unknown, shared or production targets. Use synthetic test data. Public deployment, paid integrations and changes to access require appropriate task authorization.

### Selected versions

| Package | Version | Why |
|---|---|---|
| next / eslint-config-next | 16.4.2 | Current stable; scaffolded with `create-next-app@16.4.2` |
| react / react-dom | 19.3.0 | Version chosen by that scaffold |
| typescript | 5.9.x | `typescript-eslint` 8 supports `<6.1`, so TypeScript 7 is not used |
| eslint | 9.x | `eslint-plugin-react`, `jsx-a11y` and `import` used by `eslint-config-next` do not yet declare ESLint 10 support |
| tailwindcss / @tailwindcss/postcss | 4.3.x | Installed per the Tailwind v4 Next.js guide (`postcss.config.mjs`) |
| vitest / @vitejs/plugin-react / jsdom / @testing-library/react | 5.0.x / 6.1.x / 30.x / 16.3.x | Next.js Vitest guide; tsconfig paths via Vite's native `resolve.tsconfigPaths` |
| @supabase/ssr / @supabase/supabase-js | 0.12.7 / 2.118.0 (exact) | Current stable; cookie-based SSR client, `getClaims()` session verification |
| prisma / @prisma/client / @prisma/adapter-pg | 7.10.1 (exact) | Current stable 7.x; npm `latest` points to 8.0.0-rc, not used |
| pg / zod / server-only | 8.23.x / 4.6.x / 0.0.1 | Driver for the Prisma adapter and operator script; input/env validation; server-module guard |
| @electric-sql/pglite | 0.5.10 (exact, dev) | In-process PostgreSQL for database tests (no Docker available) |

Exact resolved versions are in `package-lock.json`.

### Layout

```text
app/                 Routes: / (dashboard), /sign-in, /onboarding, /access-denied, /library, /lessons/new, /lessons/[id] (+ /edit, /delete); Server Actions
components/          Shared UI built from tokens (app shell, dashboard, form recipes)
modules/identity/    Access resolution, onboarding, dashboard use cases and ports
modules/content/     Lessons: line-v1 segmentation and counting (DEC-021/022), form parsing, use cases
modules/language/    zh/ja/en registry, IANA timezone validation
server/              auth (Supabase), config (env validation), db (Prisma), policy (permissions)
prisma/              schema.prisma and migrations (generated + hand-written security SQL)
scripts/             kiko-admin.mjs operator CLI (admission, suspension)
proxy.ts             Session refresh only; authorization lives in the server DAL
tests/               unit/, db/ (PGlite), integration/ (local PostgreSQL), component tests, support/
```

Design tokens (color, typography, spacing, radius, elevation, gradients, layout) are defined once in `app/globals.css` with Tailwind's `@theme`, following `docs/ux/DESIGN.md` (“Quiet Bloom”, DEC-026) with the AA variants in DEC-031/DEC-032, e.g. `bg-grad-cta`, `text-accent-strong`, `text-copy`, `border-control`, `shadow-card`, `max-w-content`. Fonts are loaded with `next/font/google` and self-hosted at build time (DEC-027), so `npm run build` needs network access: Plus Jakarta Sans (UI), Inter (`num` utility for numbers), Noto Sans JP/SC (not preloaded; CJK glyphs load per `unicode-range`), selected through `lang` attributes (`zh`, `ja`, `zh-Latn-pinyin`, `en-fonipa`). Icons come from `lucide-react` (DEC-028). UI strings are English and live in `modules/i18n/en.ts` (DEC-029).

`next.config.ts` sets `agentRules: false`: Next.js 16.4 `next dev` otherwise appends its own block to this repository's `AGENTS.md`.

## Configuration

`.env.example` lists every variable; those marked `[used]` are read and validated by `server/config/env.ts` (names only in errors, never values). `.gitignore` ignores `.env*` except `.env.example`. Do not create real credentials merely to fill every field. Start with optional features disabled.

For an approved local setup, copy the example to a local ignored file supported by the selected runtime, fill values through secure configuration and keep it outside Git. Framework/runtime env loading must be verified rather than assumed. The example is intentionally non-runnable until provider details and operating limits are set.

- Public browser configuration is explicitly named with `NEXT_PUBLIC_`; never put a service-role, DB or AI credential there.
- DB, provider admin credentials and export/job secrets stay server-side in a secret store/local ignored env.
- Do not print full env values, paste secrets into chat/issues or put private recordings in fixtures.
- Auth/bootstrap role assignments belong in a controlled workflow, not a default public registration toggle or `isAdmin=true` client field.
- Quotas, signed-link expiry and upload limits must be selected after P0; blank required limits must fail closed.
- Production origin, OAuth redirects and private storage policies must match deployed configuration.

### Supabase and database setup

Order matters. Steps marked **approval** write to the Supabase dev project or create credentials (AGENTS.md §6); never paste passwords or connection strings into chat or Git.

1. **CA certificate** (public): Dashboard → Database → Settings → SSL Configuration → *Download certificate*; save outside the repo, e.g. `~/.config/kiko/supabase-ca.crt`.
2. **`DIRECT_URL`** in `.env.local`: session pooler, `postgres.<ref>@<region>.pooler.supabase.com:5432`, followed by `?sslmode=require&sslaccept=strict&sslcert=<absolute CA path>` (a path without spaces, e.g. `~/.config/kiko/supabase-ca.crt`). Check read-only: `npm run db:migrate:status` must list the pending migrations. The `db:migrate:*` scripts run Prisma through a verified loopback TLS tunnel, because Prisma on macOS rejects Supabase's pooler certificate (DEC-019); do not call `npx prisma migrate …` against Supabase directly.
3. **Enforce SSL** (Dashboard → Database → Settings → SSL Configuration) so unencrypted connections are refused. Recommended: then reset the database password (Database → Settings) and update `DIRECT_URL`, because earlier probes ran without TLS (OPEN-003).
4. **Google OAuth** — see *Google sign-in configuration* below.
5. **Apply migrations — approval:** `npm run db:migrate:deploy`.
6. **Runtime credential — approval:** `npm run db:provision-runtime -- --yes`. Writes `DATABASE_URL` to `.env.local`; prints no secret.
7. **First Owner — approval:** `npm run kiko:admin -- admit --email <owner Google email> --roles OWNER,LEARNER --yes`.
8. `npm run dev`, open **http://localhost:8080** (not `127.0.0.1`: cookies are per host), sign in with Google, complete onboarding.

### Google sign-in configuration

Kiko uses Supabase's server-side PKCE flow (DEC-018). The Google client secret is stored only in Supabase; Kiko's code and `.env.local` never need it.

**Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID (type: Web application)**

| Field | Value |
|---|---|
| Authorized JavaScript origins | `http://localhost:8080` (remove before production; add the real HTTPS origin then) |
| Authorized redirect URIs | `https://<project-ref>.supabase.co/auth/v1/callback` — copy the exact value from Supabase → Authentication → Sign In / Providers → Google → *Callback URL (for OAuth)* |
| OAuth consent screen | Scopes `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile`; while in *Testing* status, add the Owner's Google account under *Test users* |

**Supabase Dashboard**

| Setting | Value |
|---|---|
| Authentication → Sign In / Providers → Google | Enabled; Client ID and Client secret from Google |
| Authentication → URL Configuration → Site URL | `http://localhost:8080` |
| Authentication → URL Configuration → Redirect URLs | `http://localhost:8080/auth/callback` (exact; no wildcard) |
| Authentication → Sign In / Providers → Email (and Phone, Anonymous) | Recommended **disabled** — Kiko rejects non-OAuth sessions anyway (OPEN-002) |
| Allow new users to sign up | Keep enabled: an approved Google account is created at first sign-in; Kiko admission still decides access |

Flow: `/sign-in` → Server Action `signInWithGoogle` → Google → `https://<project-ref>.supabase.co/auth/v1/callback` → `http://localhost:8080/auth/callback` (code exchange) → `/` → admission (`/onboarding` or `/access-denied`).

Suspend/reactivate: `npm run kiko:admin -- suspend --email … --yes` (the next request is denied). Known limits: OPEN-002/003/004 in DECISIONS.md.

**Local integration database.** With Postgres.app running, add `KIKO_TEST_DATABASE_URL=postgresql://<local user>@localhost:5432/kiko_flashcard` to `.env.local` (or the shell) and run `npm run test:integration`. The suite only accepts loopback hosts, drops and recreates schema `kiko` in that database, applies migrations with `prisma migrate deploy`, creates the NOLOGIN roles `anon`, `authenticated` and `service_role` on the local server only if missing, and runs the runtime code as `kiko_app` through `options=-c role=kiko_app` (no login or password is ever set locally). Do not keep data you need in schema `kiko` of that database.

## Testing and security

See TEST_PLAN.md. Test with synthetic Owner+Learner, Learner, Owner-only, suspended and unapproved accounts. Cover cross-owner API/storage/export paths, race/idempotency, failure recovery and actual target-device media/pointer behavior. Report checks actually run; this document has no passing-test badges because application checks have not been run.

Avoid arbitrary media URL fetching, unsafe import extraction, secrets in frontend bundles, permissive RLS and unbounded paid jobs. Keep data-source licenses/attribution and private backup protection. No security/compliance certification is claimed.

## Deployment and operations — not configured

Hosting, worker runtime, backup retention and recovery procedures remain proposed. Keep environments isolated and default audience private. Use a separately reviewed migration/deployment procedure; do not turn a successful local build into automatic production writes. Verify DB and storage recovery together; exporting user data does not replace operational backups.

## Contributing / AI-assisted development

Follow AGENTS.md and the task's Ready/Done conditions. Preserve unrelated work, keep diffs focused and test meaningful boundaries. Record architecture decisions rather than silently replacing the stack. Do not push/merge/deploy unless authorized. Store real implementation status and evidence in the task tracker/results, not by pretending planned features already work.

## License and content rights

Source-code license has not been selected; do not label this project MIT/open source by default. External dictionaries, stroke datasets, media and sample content retain their own licenses. Verify permitted storage, attribution and redistribution before inclusion or export. Branding/name clearance is not asserted.

## Next step

Finish slice 1 against the dev project (setup steps 4–7 above, then a manual Google sign-in and suspension check). Next slice: KIKO-008 lesson CRUD and library.
