# Kiko

Personal language learning for **Chinese · Japanese · English**.

Kiko connects reading/listening content, vocabulary capture, shadowing, handwriting practice where supported, and review. The goal is a useful personal learning space with private data and controllable operating cost.

## Project status

**Bootstrap (KIKO-005) — application shell only.** The repository contains a runnable Next.js app shell with the Kiko name, the zh/ja/en language registry, shared design tokens and unit tests. No sign-in, database, storage, AI or learning feature is implemented yet; the shell says so on screen. No repository URL, deployment, database or release availability is asserted here.

Confirmed: name Kiko; zh/ja/en learning; vocabulary, reading, conversations, handwriting and shadowing needs. Selected by the project owner for bootstrap: Next.js App Router + TypeScript, npm, ESLint, Tailwind CSS, `app/` at the root (no `src/`), no component library yet. Still proposed: responsive web scope/devices, Vietnamese UI, PostgreSQL/Prisma, Supabase Auth/Storage, hosting.

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

`AGENTS.md` and this README stay at the repository root; project documents live in `docs/`:

| File | Purpose |
|---|---|
| [AGENTS.md](AGENTS.md) | Provider-neutral instructions for AI coding agents |
| [docs/PROJECT_SPEC.md](docs/PROJECT_SPEC.md) | Product scope and acceptance criteria |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Modules, data flow, deployment and operational design |
| [docs/ACCESS_CONTROL.md](docs/ACCESS_CONTROL.md) | Roles, permissions, ownership and enforcement |
| [docs/UI_SPEC.md](docs/UI_SPEC.md) | Screens, interaction and responsive states |
| [docs/DATA_MODEL.md](docs/DATA_MODEL.md) | Entities, relations, constraints and retention |
| [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) | Ordered slices/tasks and completion gates |
| [docs/TEST_PLAN.md](docs/TEST_PLAN.md) | Tests, environments, release gates and evidence |
| [env.example](env.example) | Proposed configuration contract with placeholders |

Documents refer to each other by bare file name (e.g. `PROJECT_SPEC.md`); those names resolve inside `docs/`. The spec's role section (§5) is aligned with ACCESS_CONTROL.md as of spec v1.1. ADR/decision records should distinguish Proposed, Accepted and Deferred choices.

## Getting started — documentation stage

1. Assemble the documents in the actual repository; keep `AGENTS.md` uppercase for tools that discover it by that convention.
2. Read AGENTS.md, the product spec, access control and implementation plan.
3. Resolve KIKO-001 decisions; run isolated media/writing/provider spikes in P0.
4. Choose stack versions, package manager, auth, storage and deployment boundaries.
5. Bootstrap application in KIKO-005 and replace the pending setup section below with verified commands.
6. Implement one slice at a time, starting with login → choose language → create text lesson → save word → reload.

If an agent does not load AGENTS.md automatically, explicitly ask it to read the file before work. Instructions are guidance; security still requires real code, policies and tests.

## Local application setup

Verified on macOS with Node.js 24.21.0 and npm 11.19.0 (2026-10-16).

| Item | Verified value |
|---|---|
| Runtime | Node.js `>=22.12.0` (`engines`; Vitest 5 requirement); `.nvmrc` pins major 24 |
| Package manager | npm, single `package-lock.json` |
| Install | `npm ci` |
| Development | `npm run dev` → http://localhost:3000 (Turbopack) |
| Production build / serve | `npm run build`, then `npm start` → http://localhost:3000 |
| Lint | `npm run lint` (ESLint CLI with `eslint-config-next` core-web-vitals + TypeScript) |
| Typecheck | `npm run typecheck` (`next typegen && tsc --noEmit`; works on a fresh clone without a build) |
| Unit tests | `npm test` (Vitest, single run); `npm run test:watch` for watch mode |
| Database / auth / storage | Not configured — no migration, seed or provider setup exists yet |
| E2E | Not set up yet |

```bash
nvm use        # optional, reads .nvmrc
npm ci
npm run dev
```

No environment variables are required for the shell. Do not run migrations/seeds against unknown, shared or production targets. Use synthetic test data. Public deployment, paid integrations and changes to access require appropriate task authorization.

### Selected versions

| Package | Version | Why |
|---|---|---|
| next / eslint-config-next | 16.4.2 | Current stable; scaffolded with `create-next-app@16.4.2` |
| react / react-dom | 19.3.0 | Version chosen by that scaffold |
| typescript | 5.9.x | `typescript-eslint` 8 supports `<6.1`, so TypeScript 7 is not used |
| eslint | 9.x | `eslint-plugin-react`, `jsx-a11y` and `import` used by `eslint-config-next` do not yet declare ESLint 10 support |
| tailwindcss / @tailwindcss/postcss | 4.3.x | Installed per the Tailwind v4 Next.js guide (`postcss.config.mjs`) |
| vitest / @vitejs/plugin-react / jsdom / @testing-library/react | 5.0.x / 6.1.x / 30.x / 16.3.x | Next.js Vitest guide; tsconfig paths via Vite's native `resolve.tsconfigPaths` |

Exact resolved versions are in `package-lock.json`.

### Layout

```text
app/                 Routes and root layout (App Router); globals.css holds design tokens
components/          Shared UI (app shell, language card)
modules/language/    zh/ja/en registry: reading notations, stroke-practice capability
tests/               Vitest unit tests and setup
```

Design tokens (color, typography, spacing, radius, layout) are defined once in `app/globals.css` with Tailwind's `@theme`, e.g. `bg-surface`, `text-muted-text`, `rounded-panel`, `text-transcript`, `max-w-reading`, `font-zh`. Values are starting proposals; palette, fonts and visual identity remain open (Spec D10). Fonts are system stacks with per-language fallbacks selected through `lang` attributes (`zh`, `ja`, `zh-Latn-pinyin`, `en-fonipa`), so no font is downloaded at build time.

`next.config.ts` sets `agentRules: false`: Next.js 16.4 `next dev` otherwise appends its own block to this repository's `AGENTS.md`.

## Configuration

`.env.example` documents proposed names, not an implemented loader. (In this working tree the file is currently named `env.example`; renaming it to `.env.example` keeps it tracked — `.gitignore` ignores `.env*` except `.env.example`.) It must be reconciled with chosen SDK versions and code during bootstrap. Do not create real credentials merely to fill every field. Start with optional features disabled.

For an approved local setup, copy the example to a local ignored file supported by the selected runtime, fill values through secure configuration and keep it outside Git. Framework/runtime env loading must be verified rather than assumed. The example is intentionally non-runnable until provider details and operating limits are set.

- Public browser configuration is explicitly named with `NEXT_PUBLIC_`; never put a service-role, DB or AI credential there.
- DB, provider admin credentials and export/job secrets stay server-side in a secret store/local ignored env.
- Do not print full env values, paste secrets into chat/issues or put private recordings in fixtures.
- Auth/bootstrap role assignments belong in a controlled workflow, not a default public registration toggle or `isAdmin=true` client field.
- Quotas, signed-link expiry and upload limits must be selected after P0; blank required limits must fail closed.
- Production origin, OAuth redirects and private storage policies must match deployed configuration.

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

KIKO-005 bootstrap is in place. Before KIKO-006 (auth, admission, roles), complete the KIKO-001 decision register and the auth/storage part of KIKO-004: auth provider and sign-in method, Owner bootstrap procedure, database/migration ownership and hosting.
