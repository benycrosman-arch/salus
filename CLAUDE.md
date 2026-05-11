# CLAUDE.md — Salus

Operating manual for Claude Code in this repo. Read this before making changes.

## What Salus is

Salus is a Brazilian nutrition platform: pacientes log meals (photo + AI macros), and their nutricionista monitors progress, sets protocols, and chats in‑app. Hosted at `salusai.com.br` (legacy alias `salus.nulllabs.org` also active) under NullLabs (`nulllabs.org`). Primary language is **PT‑BR**; English exists via `next-intl`.

The npm package name is still `nutrigen` (legacy) — the product is **Salus**. Don't rename.

## Stack

- Next.js 14.2.35, App Router, React 18, TypeScript strict
- Supabase (Postgres + Auth + RLS) — `@supabase/ssr` for server, browser, and a service‑role client
- Tailwind + shadcn/ui (Radix primitives in `src/components/ui/`)
- TanStack Query, Zustand, react‑hook‑form + zod
- next‑intl (PT default, EN secondary) — messages in `src/messages/{pt,en}.json`
- Anthropic SDK (`@/lib/ai-client.ts`) for meal photo analysis and AI features
- WhatsApp via **Z‑API** (`@/lib/zapi/`); the older Chatwoot client is deprecated and being removed
- PostHog analytics, RevenueCat for subscriptions
- Vercel hosting + Vercel Cron (see `vercel.json`)

## Repo layout

```
src/
  app/
    (app)/              # Paciente surface — dashboard, log, plan, progress, mensagens, settings
    nutri/              # Nutricionista surface — pacientes, protocolo, config
    onboarding/         # Paciente onboarding quiz (gates the app)
    onboarding-nutri/   # Nutricionista onboarding (gates /nutri)
    aceitar-convite/    # Public invite acceptance (token-based, no auth)
    auth/               # Login, signup, callback
    api/                # Route handlers — see API section
  components/
    ui/                 # shadcn primitives (don't edit manually; regenerate)
    dashboard/, log/, layout/, paywall-modal.tsx, ...
  lib/
    supabase/           # client.ts (browser), server.ts (RSC), service.ts (service role)
    ai-client.ts        # Anthropic wrapper with timeout + transient retry
    whatsapp/           # Inbound agent, dispatch, nudges, weekly report, OTP, phone utils
    zapi/client.ts      # Z-API HTTP client
    feature-quota.ts    # Plan-based quotas (e.g. essencial = 30 photo analyses/month)
    pro.ts, admin.ts, goals.ts, posthog.ts, prompts/, labs/
  middleware.ts         # Auth + role gating + onboarding/verification redirects
  i18n/                 # next-intl config
  messages/{pt,en}.json
supabase/
  migrations/           # NNN_name.sql, currently up to 021
scripts/                # seed-taco.ts, seed-openfoodfacts-br.ts (run via npm scripts)
vercel.json             # Cron: hourly /api/cron/whatsapp-nudges, Monday /api/cron/weekly-report
```

## Critical conventions

**Routes are in Portuguese.** Don't translate them. Examples that look like typos but aren't: `aceitar-convite`, `aguardando-verificacao`, `pacientes`, `protocolo`, `mensagens`. UI strings in error responses are also PT‑BR.

**Two surfaces, one middleware.** `src/middleware.ts` is the single source of truth for role gating. It enforces:
- Unauthenticated users → `/auth/login` (preserves `redirectTo`)
- Onboarding incomplete → `/onboarding` (paciente) or `/onboarding-nutri` (nutri)
- Nutri without verified CRN → `/nutri/aguardando-verificacao` (admins bypass via `isAdminEmail`)
- Cross-role access blocked: pacientes can't reach `/nutri/*`, nutricionistas can't reach paciente-only routes (`/dashboard`, `/log`, `/plan`, `/grocery`, `/progress`, `/health-data`, `/insights`, `/meal-result`, `/mensagens`)

If you add a new top-level route, decide which surface it belongs to and update `PATIENT_ONLY` if applicable.

**Three Supabase clients — pick the right one.**
- `@/lib/supabase/server` (`createClient`) — RSC and authenticated route handlers. Honors RLS.
- `@/lib/supabase/client` — browser components (`'use client'`).
- `@/lib/supabase/service` — service role. **Only** for unauthenticated public flows (e.g. `/api/nutri/invite/lookup`) or trusted server-side jobs (crons, webhooks). Never import service role into a client component or a user-authenticated path that should respect RLS.

**Migrations are append-only.** New SQL files go in `supabase/migrations/` as `NNN_short_name.sql` where NNN is the next sequential number (next is `022`). Never edit a committed migration. RLS is mandatory on new tables; mirror the patterns in `006_ai_security.sql` and `011_fix_profiles_rls_recursion.sql`.

**API responses.** Route handlers return `NextResponse.json({ ok: true, ... })` on success or `{ error: 'mensagem em PT' }` on failure. Validate inputs with `zod` at the boundary; trust internal callers.

**Quotas and plans.** Feature gating goes through `@/lib/feature-quota.ts` and `@/lib/use-feature-quota.ts`. The Essencial plan is 30 photo analyses/month — confirmed in commit `1313b95`. Don't reintroduce the old 60 limit.

**Admin allowlist.** `isAdminEmail` (`@/lib/admin`) bypasses CRN verification and role gates so the founder/team can preview either surface. The user (`benycrosman@gmail.com`) is on it.

**Comments are sparse.** Existing files only have comments where the *why* is non‑obvious (e.g. why a token must be 64-char hex, why service role is used for an unauthenticated endpoint). Match that style — no block docstrings, no narration of what the code does.

## WhatsApp / Z‑API

Inbound webhook: `src/app/api/webhooks/zapi/route.ts`. Outbound dispatch: `@/lib/whatsapp/dispatch.ts` → `@/lib/zapi/client.ts`. The agent that interprets paciente messages lives in `@/lib/whatsapp/agent.ts`; templates in `nudge-templates.ts` and `weekly-report.ts`. Feature flag in `@/lib/whatsapp/feature-flag.ts`.

The repo currently has uncommitted deletions of the Chatwoot integration (`src/app/api/webhooks/chatwoot/route.ts`, `src/lib/chatwoot/client.ts`). Don't restore them; Z‑API is the active path.

## Crons

Both run on Vercel Cron and hit Next.js route handlers. They must be idempotent — Vercel may retry.

- `0 * * * *` → `/api/cron/whatsapp-nudges`
- `0 * * * 1` → `/api/cron/weekly-report` (Monday midnight UTC)

Protect cron endpoints with the `CRON_SECRET` header check.

## Commands

```bash
npm run dev              # next dev (localhost:3000)
npm run build            # next build — run before claiming a feature works
npm run lint             # next lint
npm run seed:taco        # Brazilian food DB seed (TACO)
npm run seed:openfoodfacts  # OpenFoodFacts BR seed
```

There is **no test suite**. "It compiles" + manual flow check is the bar. For UI changes, run `npm run dev` and exercise the actual flow in a browser before reporting done.

## Environment

Secrets live in `.env.local` (gitignored). The big ones:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`
- `ZAPI_INSTANCE_ID`, `ZAPI_TOKEN`, `ZAPI_CLIENT_TOKEN`
- `POSTHOG_*`, `REVENUECAT_*`
- `CRON_SECRET`

Never paste real values into code, comments, commits, or chat. If you spot one in a diff, stop and warn the user.

## Domain glossary (PT‑BR → EN)

- **paciente** — patient (end user logging meals)
- **nutri / nutricionista** — registered dietitian (the B2B side); requires a verified CRN to access `/nutri`
- **CRN** — Conselho Regional de Nutricionistas registration number
- **convite** — invite (nutri → paciente onboarding via token link `/aceitar-convite?token=…`)
- **protocolo** — the meal/training plan a nutri sets for a paciente
- **mensagens** — in‑app chat between paciente and their nutri (table `nutri_chats`)
- **essencial** — the entry paid plan (30 photo analyses/month)

## Things not to do

- Don't run destructive git commands (`reset --hard`, `push --force`, branch deletions) without explicit ask.
- Don't edit a committed migration. Add a new one.
- Don't introduce a fourth Supabase client wrapper. Use the three that exist.
- Don't add `// removed` comments or backwards-compat shims for deleted code (e.g. Chatwoot). Delete cleanly.
- Don't translate route segments to English.
- Don't bypass `middleware.ts` with ad‑hoc redirects in pages — extend the middleware.
- Don't add `console.log` for debugging in committed code; use PostHog or remove before commit.
- Don't claim a UI change works without exercising it in `npm run dev`.

## Useful starter prompts

When picking up new work:

```
Read CLAUDE.md, then read the relevant route under src/app and the
migration that defines its tables. Outline what you'd change before editing.
```

```
Trace how a paciente meal log flows from src/app/(app)/log → the API route →
Supabase → the dashboard re-render. Don't change anything yet.
```

```
The nutri verification gate redirected me unexpectedly. Read src/middleware.ts
and explain which branch fired, given role=nutricionista and
nutri_verification_status=pending.
```

## Contacts

- Support: `suporte@nulllabs.org`
- Privacy / LGPD: `privacidade@nulllabs.org`
- Maintainer: benycrosman@gmail.com
