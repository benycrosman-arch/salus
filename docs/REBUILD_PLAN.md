# Salus — Auth, Invitation & Realtime Rebuild Plan

**Status:** Plan Mode. Read-only investigation complete. Awaiting `approved` before any application code changes.
**Scope confirmed with user:** Web-only (this Next.js repo). iOS deferred to a separate session. Tables renamed PT → EN. Recent shipped work (access codes, host-header guard, 24h expiry, partial unique index) preserved as starting state.
**Generated:** 2026-05-12 (commit `5a83474` baseline).

---

## Section 1 — Investigation Findings

### 1.1 Current Supabase schema (audit)

**Tables in scope of this rebuild** (auth / invitation / link / messaging):

| Current name | Purpose | Migrations | Will become |
|---|---|---|---|
| `profiles` | Per-user row, role discriminator, onboarding flag | 001, 002, 003, 004, 005, 010, 011, 012, 024, 025 | `profiles` (kept; rename not justified — already EN) |
| `nutri_invites` | Pending invitations from nutri → patient, token, code_hash | 001, 014, 018†, 027†, 028, 029 | **MERGED INTO** `nutritionist_patient_links` |
| `nutri_patient_links` | Active nutri↔patient relationship | 001, 014 | `nutritionist_patient_links` |
| `nutri_chats` | In-app chat messages | 001, 020 | `messages` |
| (new) | Nutritionist-set targets for a patient | — | `patient_goals` |
| (new) | Compliance audit trail | — | `audit_log` |

† `patient_phone` column added in 018 then dropped in 027 (WhatsApp-invite path retired).

**Tables NOT in this rebuild but adjacent** (12+ RLS policies reference `nutri_patient_links` from these tables — all need s/nutri_patient_links/nutritionist_patient_links/ in their `exists(...)` predicates):

`meals`, `meal_plans`, `lab_results`, `lab_uploads`, `body_logs`, `body_measurements`, `progress_photos`, `daily_stats`, `nutri_recommendations`, `nutri_patient_attachments`, `nutri_settings`, `nutri_commissions`, `nudges`, plus storage policies (`nutri_credentials_*`, `Nutri reads linked patients lab PDFs`).

**Out-of-band tables, unrelated to this rebuild:** `foods`, `food_aliases`, `food_servings`, `user_foods`, `streaks`, `wearable_data`, `device_connections`, `ai_reports`, `ai_usage_log`, `admin_users`, `admin_audit_log`, `app_config`, `abuse_reports`, `whatsapp_connections`, `whatsapp_messages`, `user_preferences`, `user_goals_targets`.

**Passwords:** No custom password table exists in this repo. Credentials live exclusively in `auth.users` (Supabase Auth). Plan bug #1 ("passwords stored per-relationship") **does not apply** — flagged in §1.4.

**`handle_new_user` trigger:** present and correct as of migration 024. Reads `raw_user_meta_data.role` ∈ `{'user','nutricionista'}` and inserts into `profiles`. Migration 025 marks nutri `onboarding_completed=true` at insert (they skip the paciente quiz). Trigger guard `guard_profile_admin_columns` from migration 011 protects `role`, `account_status`, `daily_ai_limit`, `monthly_ai_limit` from non-service-role updates.

**RLS posture:** Mandatory on all in-scope tables. Patterns follow the "owner-only" or "linked-patient-via-exists-clause" idioms. Storage buckets `nutri-credentials`, `lab-pdfs`, `attachments` each have 3-4 policies.

### 1.2 NutriGen current state

- **Invite creation:** [src/app/api/nutri/invite/route.ts](src/app/api/nutri/invite/route.ts) — POST creates invite, generates 6-char code, hashes with `invite.id` salt, returns `{link, accessCode, expiresInHours: 24}`. GET lists invites.
- **Invite accept:** [src/app/api/nutri/invite/accept/route.ts](src/app/api/nutri/invite/accept/route.ts) — verifies token, email match, code (5-attempt limit), upserts into `nutri_patient_links`.
- **Code verify (pre-auth):** [src/app/api/nutri/invite/verify-code/route.ts](src/app/api/nutri/invite/verify-code/route.ts) — public endpoint, sets `salus_invite` cookie with `{token, code}` JSON on success.
- **Public landing:** [src/app/aceitar-convite/page.tsx](src/app/aceitar-convite/page.tsx) + [code-entry-form.tsx](src/app/aceitar-convite/code-entry-form.tsx) — server component looks up invite, client form posts code.
- **Confirmar (post-auth):** [src/app/aceitar-convite/confirmar/page.tsx](src/app/aceitar-convite/confirmar/page.tsx).
- **Auth callback:** [src/app/auth/callback/route.ts](src/app/auth/callback/route.ts) — reads JSON cookie, forwards token+code to accept endpoint.
- **Patient list query (nutri):** [src/app/nutri/pacientes/page.tsx:42-54](src/app/nutri/pacientes/page.tsx#L42) — parallel `nutri_patient_links` (active) + `listInvitesForNutri` helper. The helper ([src/lib/nutri-invites.ts](src/lib/nutri-invites.ts)) is column-aware (`patient_email` vs legacy `email`).
- **Patient dashboard:** [src/app/(app)/dashboard/](src/app/) — owner-only meals/stats; no cross-user data.
- **Messages:** [src/app/api/nutri/chats/route.ts](src/app/api/nutri/chats/route.ts) + [src/app/mensagens/](src/app/) — reads/writes `nutri_chats`. Patient-side write enabled by migration 020.
- **Auth setup:** Supabase SSR via [@/lib/supabase/{client,server,service}.ts](src/lib/supabase/) — three flavors (browser, RSC, service-role).
- **Middleware:** [src/middleware.ts](src/middleware.ts) — role gating, onboarding redirects, admin bypass via `isAdminEmail`.
- **Email:** [src/lib/email.ts](src/lib/email.ts) — minimal Resend wrapper, `nutriInviteEmail()` template. Code NOT included in email body by design.
- **Realtime subscriptions:** **NONE.** `grep -rn "supabase\.channel\|\.on('postgres_changes'\|realtime"` returns zero hits across `src/`. Both surfaces re-fetch via `router.refresh()` after mutations.

### 1.3 Salus iOS state

Out of scope. Per user direction: iOS investigation deferred to its own session against the iOS repo, which is not available in this workspace.

### 1.4 End-to-end trace + correlation with plan's six bugs

**Current happy path** (post commits `73f8900` + `5a83474`):

1. Nutri logs in → middleware routes to `/nutri` → [pacientes/page.tsx](src/app/nutri/pacientes/page.tsx) runs `listInvitesForNutri` + active links query.
2. Nutri opens "Convidar paciente" form, enters email, taps Enviar.
3. POST `/api/nutri/invite` → `verifyInviteRequest` (cap + dup check + email strictness) → `generateAccessCode` → insert with temp hash → rotate to id-salted hash → email dispatched (no code in body) → response `{link, accessCode, expiresInHours: 24}`.
4. UI shows credentials card with link + code + "Copiar mensagem pronta".
5. Nutri sends link via email, code via WhatsApp/verbal (separate channels).
6. Patient clicks link → `/aceitar-convite?token=…` → server fetches invite → renders nutri name + `<CodeEntryForm>`.
7. Patient enters code → POST `/api/nutri/invite/verify-code` → service-role verifies → sets `salus_invite` cookie `{token, code}` JSON → redirects to `/auth/signup?email=…` (or `/aceitar-convite/confirmar` if already logged in).
8. Patient signs up → `auth/callback` reads cookie, forwards token+code to `/api/nutri/invite/accept` → row in `nutri_patient_links` upserted to `status='active'`.
9. **Patient sees dashboard** (RLS allows owner reads). **Nutri does NOT see new patient until they reload the dashboard** — bug #4 still active.

**Plan's bug list vs. actual:**

| # | Plan claim | Status in this repo |
|---|---|---|
| 1 | Passwords stored/checked per-relationship | **Does not exist.** Credentials are exclusively in `auth.users`. The 6-char "access code" added in `5a83474` is a separate one-time-use authorization token, not a password. |
| 2 | Patient app empty after login | N/A (no iOS). Web equivalent: `/dashboard` queries owner-only RLS, no obvious bug. Need to confirm what state user observed. |
| 3 | Nutri dashboard doesn't show linked patients | **Fixed.** Migration 014 renamed `client_id` → `patient_id` and `email` → `patient_email`. Migration 027 re-asserted idempotently. Helper handles either column name at runtime. |
| 4 | No realtime sync | **Confirmed.** Zero `supabase.channel(...)` calls in `src/`. |
| 5 | Features don't unlock after acceptance | **Partially true** — caused by #4. Once link is `active` RLS would allow access, but UI doesn't observe the change until refresh. |
| 6 | No invitation deep links | **True for iOS.** Web links work via `https://salusai.com.br/aceitar-convite?token=…`. No `salus://` scheme or Universal Links — that's the iOS rebuild's job. |

**Conclusion:** Of the six plan bugs, only #4 and (consequently) #5 are unresolved blockers for the web rebuild. Bug #6 is iOS-only. Bugs #1 and #3 are already false/fixed. Bug #2 needs user repro to confirm.

---

## Section 2 — Target Architecture (Web)

### 2.1 Authentication Principle
Unchanged from plan: `auth.users` is sole credential store. Authorization between roles is the `nutritionist_patient_links` join table + RLS. The 6-char invite access code is preserved as a **second-factor for the link establishment moment only** (not stored in plaintext, never used post-acceptance).

### 2.2 Schema (web subset)

```sql
-- profiles: same structure as current. NO rename. Migration just enforces
-- the `role` check to {'patient','nutritionist'} going forward (currently
-- 'user' and 'nutricionista' — we'll dual-write during transition, then
-- enforce). See §2.7 for the transition plan.

-- nutritionist_patient_links: merges nutri_invites + nutri_patient_links.
-- Pending invites and active links live in the same table, discriminated
-- by `status`. Preserves the access-code feature shipped in 5a83474.
create table nutritionist_patient_links (
  id uuid primary key default gen_random_uuid(),
  nutritionist_id uuid not null references profiles(id) on delete cascade,
  patient_id uuid references profiles(id) on delete cascade,        -- null until accepted
  patient_email text not null,                                       -- captured at invite
  status text not null default 'pending'
    check (status in ('pending','accepted','revoked','expired')),
  invite_token text unique not null default encode(extensions.gen_random_bytes(32), 'hex'),
  invite_code_hash text,                                             -- sha256(id || ':' || code)
  invite_code_attempts integer not null default 0,
  invite_expires_at timestamptz not null default (now() + interval '24 hours'),
  accepted_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Race-proof: at most one pending invite per (nutri, email). Migrated
-- from migration 028's partial unique index. Lowercased for case-insensitive
-- match.
create unique index nutritionist_patient_links_one_pending_idx
  on nutritionist_patient_links (nutritionist_id, lower(patient_email))
  where status = 'pending';

create index nutritionist_patient_links_by_patient_idx
  on nutritionist_patient_links (patient_id) where patient_id is not null;
create index nutritionist_patient_links_by_status_idx
  on nutritionist_patient_links (nutritionist_id, status);

-- messages: was nutri_chats. Same shape, scoped to a link instead of a
-- (nutri_id, patient_id) pair so revocation cascades correctly.
create table messages (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references nutritionist_patient_links(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  body text not null,
  read_at timestamptz,
  created_at timestamptz default now()
);
create index messages_by_link_idx on messages (link_id, created_at desc);

-- patient_goals: NEW. Nutritionist-set macro targets visible to patient.
create table patient_goals (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references nutritionist_patient_links(id) on delete cascade,
  patient_id uuid not null references profiles(id) on delete cascade,
  nutritionist_id uuid not null references profiles(id) on delete cascade,
  calories_target int,
  protein_g int,
  carbs_g int,
  fat_g int,
  notes text,
  updated_at timestamptz default now(),
  unique (link_id)
);

-- audit_log: NEW. Insert-only via security-definer RPCs.
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id),
  action text not null,                                  -- 'invite_created' | 'invite_accepted' | 'link_revoked' | 'goals_updated' | 'code_attempt_failed'
  entity text not null,                                  -- 'nutritionist_patient_links' | 'patient_goals' | 'profiles'
  entity_id uuid,
  metadata jsonb default '{}',
  ip_address inet,
  user_agent text,
  created_at timestamptz default now()
);
create index audit_log_actor_idx on audit_log (actor_id, created_at desc);
create index audit_log_entity_idx on audit_log (entity, entity_id);
```

### 2.3 RLS policies (web subset, full SQL in Appendix A)

**`nutritionist_patient_links`** — replaces the current `Nutri manages own invites`, `Nutri manages own links`, `Patient can view own links`:

```sql
-- Nutritionists: full control over their own rows
create policy "nutri_owns_links" on nutritionist_patient_links
  for all using (auth.uid() = nutritionist_id);

-- Patients: see pending invites addressed to their email + accepted links
create policy "patient_sees_own_links" on nutritionist_patient_links
  for select using (
    auth.uid() = patient_id
    or (status = 'pending' and lower(patient_email) = lower(auth.email()))
  );

-- Patients: can only set status='accepted' on their own pending invite,
-- via the accept_invitation RPC (which runs as security definer).
-- No raw UPDATE policy — RPC is the only path.
```

**`messages`** — replaces current `nutri_chats` policies:

```sql
create policy "messages_member_select" on messages
  for select using (
    exists (
      select 1 from nutritionist_patient_links l
      where l.id = messages.link_id
        and l.status = 'accepted'
        and (l.nutritionist_id = auth.uid() or l.patient_id = auth.uid())
    )
  );
create policy "messages_member_insert" on messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from nutritionist_patient_links l
      where l.id = messages.link_id
        and l.status = 'accepted'
        and (l.nutritionist_id = auth.uid() or l.patient_id = auth.uid())
    )
  );
create policy "messages_sender_marks_read" on messages
  for update using (sender_id = auth.uid())
  with check (sender_id = auth.uid());
```

**`patient_goals`** — new:
```sql
create policy "goals_nutri_manage" on patient_goals
  for all using (
    nutritionist_id = auth.uid()
    and exists (
      select 1 from nutritionist_patient_links l
      where l.id = patient_goals.link_id and l.status = 'accepted'
    )
  );
create policy "goals_patient_read" on patient_goals
  for select using (patient_id = auth.uid());
```

**`audit_log`** — insert via RPC only, self-read:
```sql
create policy "audit_self_read" on audit_log for select using (actor_id = auth.uid());
-- No INSERT policy: only the security-definer RPCs in §2.4 write here.
```

**Adjacent tables (blast radius — 12+ policies on other tables reference `nutri_patient_links`):**

These need `s/nutri_patient_links/nutritionist_patient_links/` and `s/patient_id = .. and nutri_id = ../patient_id = .. and nutritionist_id = ../`:

| Table | Policy name | File |
|---|---|---|
| `meals` | Nutris read linked patients meals | 008 |
| `meal_plans` | Nutris manage linked patients plans | 008 |
| `body_logs` | Nutris read linked patient body | 008 |
| `body_measurements` | Nutris read linked patient measurements | 008 |
| `lab_results` | Nutris read linked patients labs | 019 |
| `lab_uploads` | Nutris read linked patients uploads | 019 |
| `nutri_recommendations` | Paciente reads own recommendations + Nutri manages own | 026 |
| `nutri_patient_attachments` | (4 policies — read/insert/delete/uploads) | 019 |
| `nutri_commissions` | Patient reads own + Nutri reads own | 016 |
| storage.objects | Nutris read linked patients lab PDFs | 019 |
| `profiles` | Nutris can view linked patient profiles | 002 |

All rewritten in Appendix A.

### 2.4 RPC functions (security definer)

```sql
-- All three write to audit_log.

create or replace function create_invitation(
  p_patient_email text,
  p_patient_name text default null,
  p_code_hash text default null,         -- supplied by the caller; raw code never crosses the DB boundary
  p_expires_in_hours int default 24
) returns nutritionist_patient_links

create or replace function accept_invitation(
  p_token text,
  p_code text                            -- raw code; RPC hashes with row id and constant-time compares
) returns nutritionist_patient_links

create or replace function revoke_link(
  p_link_id uuid
) returns nutritionist_patient_links
```

The `accept_invitation` RPC enforces:
- token matches a non-expired, non-revoked, non-accepted row
- `auth.email()` matches `lower(patient_email)`
- code (when `invite_code_hash` is not null) matches via constant-time hash compare
- attempt counter increments on wrong code; locks invite at 5
- on success: stamps `patient_id = auth.uid()`, `accepted_at = now()`, `status = 'accepted'`
- writes `invite_accepted` to `audit_log` with IP + UA

### 2.5 Realtime channels (web)

**Nutri dashboard** ([src/app/nutri/pacientes/page.tsx](src/app/nutri/pacientes/page.tsx) becomes a client component or hosts a client hook):

```ts
const channel = supabase
  .channel(`nutri:${userId}:links`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'nutritionist_patient_links',
    filter: `nutritionist_id=eq.${userId}`,
  }, refresh)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'messages',
    filter: `link_id=in.(${activeLinkIds.join(',')})`,
  }, refresh)
  .subscribe()
```

**Patient dashboard:**
```ts
.channel(`patient:${userId}:state`)
.on('postgres_changes', {
  event: '*',
  schema: 'public',
  table: 'nutritionist_patient_links',
  filter: `patient_id=eq.${userId}`,
}, refresh)
.on('postgres_changes', {
  event: '*',
  schema: 'public',
  table: 'patient_goals',
  filter: `patient_id=eq.${userId}`,
}, refresh)
```

Caveats:
- Supabase Realtime filter syntax doesn't support `OR` across columns — we use one subscription per relationship and aggregate client-side.
- The `in.(...)` filter on `link_id` requires resubscribing when the link set changes — solved by listening to link changes and rebuilding the message subscription on accept/revoke.
- On Vercel, the client (`'use client'`) holds the WS — server components don't keep connections.

### 2.6 Invitation flow (web, post-rebuild)

Diff vs. current:
- Single table (`nutritionist_patient_links`) instead of two.
- `accept_invitation` RPC replaces the hand-rolled accept route logic.
- Nutri dashboard reflects acceptance in <2s via Realtime instead of after `router.refresh()`.
- Otherwise the user-visible flow stays identical to what `5a83474` shipped (link + code, 24h expiry, 5 attempts).

### 2.7 Migration strategy (NOT a `db reset`)

Per user direction "keep recent work", we will **NOT** `db reset`. Instead, migrations 030+ will:

1. **030** — Create new tables (`messages`, `patient_goals`, `audit_log`) and new column names on `nutritionist_patient_links` (initially as an alias view over `nutri_invites` + `nutri_patient_links`) so both old and new code can read.
2. **031** — Backfill `nutritionist_patient_links` by `union all` from the two old tables.
3. **032** — Install RPCs and new RLS policies pointing at the new table.
4. Application deploy: switch all code to new names. Old tables still exist as fallback.
5. **033** — Rewrite the 12+ adjacent-table RLS policies to use the new table.
6. **034** — Drop `nutri_invites`, `nutri_patient_links`, `nutri_chats` after a 7-day soak.

Each step is independently revertable. No single deploy carries the entire blast radius.

Alternative (simpler, riskier): one big migration that renames tables and rewrites all policies in a transaction. Faster but a single bug = full outage.

**Recommendation: phased.** See Appendix C for the trade-off rationale.

---

## Section 3 — Implementation Tasks (Ordered)

| # | Task | Files | Test | Depends on |
|---|---|---|---|---|
| 1 | Migration 030: new tables (`messages`, `patient_goals`, `audit_log`) + columns on links | `supabase/migrations/030_unified_links_schema.sql` | `npx supabase db push` succeeds; `select` from each new table returns 0 rows | — |
| 2 | Migration 031: backfill `nutritionist_patient_links` from old tables | `supabase/migrations/031_backfill_links.sql` | row count matches sum of old tables | 1 |
| 3 | Migration 032: RPCs (`create_invitation`, `accept_invitation`, `revoke_link`) + new RLS on new tables | `supabase/migrations/032_link_rpcs_and_rls.sql` | RPC call returns expected row; RLS denies non-owners | 1 |
| 4 | Helper rewrite: typed RPC wrappers replacing direct table access | `src/lib/links.ts` (new), `src/lib/messages.ts` (new), `src/lib/goals.ts` (new) | unit-ish manual check via `npm run dev` | 3 |
| 5 | API: rewrite `/api/nutri/invite` to call `create_invitation` RPC | `src/app/api/nutri/invite/route.ts` | invite creates row in new table; access code still works | 4 |
| 6 | API: rewrite `/api/nutri/invite/accept` to call `accept_invitation` RPC | `src/app/api/nutri/invite/accept/route.ts` | end-to-end accept still works | 4 |
| 7 | API: rewrite `/api/nutri/invite/verify-code` (now just probes the RPC dry-run path) | `src/app/api/nutri/invite/verify-code/route.ts` | cookie path unchanged | 4 |
| 8 | API: `/api/nutri/messages` + `/api/patient/messages` | new routes | message CRUD works, both sides | 4 |
| 9 | API: `/api/nutri/goals` (set) + `/api/patient/goals` (read) | new routes | nutri sets, patient sees | 4 |
| 10 | API: `/api/nutri/links/[id]/revoke` calling `revoke_link` RPC | new route | revocation cascades | 4 |
| 11 | Nutri pacientes page → client component with Realtime subscription | `src/app/nutri/pacientes/page.tsx`, new `pacientes-realtime.tsx` | accept on patient → nutri dashboard updates without refresh | 5,6 |
| 12 | Patient dashboard Realtime: link status + goals | `src/app/(app)/dashboard/`, new `useLinkState` hook | nutri sets goals → patient sees instantly | 9,11 |
| 13 | Update all 12+ adjacent-table RLS policies → new table name | `supabase/migrations/033_rewrite_adjacent_rls.sql` | meals/labs/etc. still readable by linked nutri | 6 |
| 14 | Code references: `nutri_invites` / `nutri_patient_links` / `nutri_chats` → new names | 13 files listed in Appendix B | type check passes; build green | 5–10 |
| 15 | Drop old tables after 7-day soak | `supabase/migrations/034_drop_legacy_tables.sql` | nothing reads from them per logs | 14 |
| 16 | Manual QA against §4 checklist | — | every box ticked | 15 |

---

## Section 4 — Testing Checklist (Web)

- [ ] New nutri signs up → `profiles` row created with `role='nutricionista'` (or new `'nutritionist'` per §2.2 enum change — see open question Q3).
- [ ] Nutri creates invite → row in `nutritionist_patient_links` with `status='pending'`, code generated, hash stored.
- [ ] Invite email arrives without code in body; only link.
- [ ] Patient visits link → enters code → cookie set, redirected to signup.
- [ ] Patient signs up → trigger creates profile → `auth/callback` calls `accept_invitation` RPC → link flips to `accepted`.
- [ ] **Nutri dashboard reflects acceptance within 2s (Realtime).**
- [ ] Nutri sets calorie target via `/api/nutri/goals` → row in `patient_goals` → patient's dashboard reflects within 2s.
- [ ] Either party sends message → other sees within 2s.
- [ ] Second nutri querying patient A's goals → 0 rows (RLS).
- [ ] Nutri revokes link → patient's UI loses message tab + goals view within 2s.
- [ ] Patient signs in on a second device → all current state syncs immediately.
- [ ] Expired invite (>24h) — `accept_invitation` returns `expired`.
- [ ] Wrong code 5x → invite locks; nutri can issue a new one.
- [ ] All invite/accept/revoke/goal events present in `audit_log`.
- [ ] `npm run build` clean; no type errors.

---

## Section 5 — Security & Compliance

- **HIPAA/LGPD posture:** all PHI (`patient_goals`, `messages`, `profiles`, `meals`, `lab_results`) gated by RLS. RLS predicates require `accepted` link status — pending invites don't grant read access.
- **Invite tokens:** 32 bytes `gen_random_bytes`, hex-encoded (64 chars) — unchanged from current.
- **Access codes:** 6 chars from 32-symbol alphabet (no I/O/0/1), salted SHA-256 hash with row UUID, constant-time compare, 5-attempt lock — preserved verbatim from `5a83474`.
- **Audit:** every mutation through an RPC writes `audit_log` with `auth.uid()`, IP (from `request.headers`), and a structured metadata blob.
- **Supabase Auth:** continue using existing email/password + Google OAuth. Recommend enabling Supabase's leaked-password protection and minimum-10-char enforcement (currently 6 IIRC — confirm in dashboard).
- **NEXT_PUBLIC_APP_URL** required in prod (already enforced post `73f8900` — RPC will also reject empty `base_url` for the same reason).
- **Cookies:** `salus_invite` is httpOnly, `sameSite=lax`, `secure` in prod, 24h max-age — unchanged from `5a83474`.

---

## Appendix A — Full SQL Migration Draft

Drafted, not yet run. To be split into migrations 030 / 031 / 032 / 033 per §2.7. Full text omitted from this revision for brevity; will be produced as separate `.sql` files in the implementation pass for reviewability.

Key snippets already inlined in §2.2 (schema), §2.3 (RLS), §2.4 (RPC signatures).

---

## Appendix B — File-by-file Change List

**Migrations (new):**
- `supabase/migrations/030_unified_links_schema.sql`
- `supabase/migrations/031_backfill_links.sql`
- `supabase/migrations/032_link_rpcs_and_rls.sql`
- `supabase/migrations/033_rewrite_adjacent_rls.sql`
- `supabase/migrations/034_drop_legacy_tables.sql`

**Application code (modified):**

| File | Change |
|---|---|
| [src/lib/nutri-invites.ts](src/lib/nutri-invites.ts) | Replace column-aware helper with thin RPC wrappers. The probe logic retires once 034 lands. |
| [src/lib/invite-security.ts](src/lib/invite-security.ts) | Move cap/dup logic INTO the `create_invitation` RPC (DB-side, race-proof). This file becomes a thin client-side validator. |
| [src/lib/invite-codes.ts](src/lib/invite-codes.ts) | Unchanged — generation + hash semantics preserved. |
| [src/lib/email.ts](src/lib/email.ts) | Unchanged. |
| [src/app/api/nutri/invite/route.ts](src/app/api/nutri/invite/route.ts) | POST calls `create_invitation` RPC, returns `{link, accessCode, expiresInHours}`. GET reads new table. |
| [src/app/api/nutri/invite/accept/route.ts](src/app/api/nutri/invite/accept/route.ts) | Calls `accept_invitation` RPC. Cookie parsing unchanged. |
| [src/app/api/nutri/invite/verify-code/route.ts](src/app/api/nutri/invite/verify-code/route.ts) | Calls a new `verify_code_dry_run` RPC (or reuses accept with a `dry_run=true` flag). |
| [src/app/aceitar-convite/page.tsx](src/app/aceitar-convite/page.tsx) | Replace direct table read with RPC. |
| [src/app/aceitar-convite/code-entry-form.tsx](src/app/aceitar-convite/code-entry-form.tsx) | Unchanged. |
| [src/app/aceitar-convite/confirmar/page.tsx](src/app/aceitar-convite/confirmar/page.tsx) | Unchanged. |
| [src/app/auth/callback/route.ts](src/app/auth/callback/route.ts) | Unchanged (cookie path is stable). |
| [src/app/nutri/pacientes/page.tsx](src/app/nutri/pacientes/page.tsx) | Convert to client-and-server hybrid; spawn Realtime subscription via new `pacientes-realtime.tsx`. |
| [src/app/nutri/pacientes/[id]/page.tsx](src/app/nutri/pacientes/[id]/page.tsx) | Reads from new tables; goals editor; message thread. |
| [src/app/nutri/page.tsx](src/app/nutri/page.tsx) | Same Realtime treatment; KPI cards subscribe. |
| [src/app/api/nutri/chats/route.ts](src/app/api/nutri/chats/route.ts) | Read/write `messages` (was `nutri_chats`). Filter by `link_id`. |
| [src/app/api/nutri/attachments/route.ts](src/app/api/nutri/attachments/route.ts) | Update `exists(... nutritionist_patient_links ...)` in any service-role queries. |
| [src/app/api/nutri/recommendations/route.ts](src/app/api/nutri/recommendations/route.ts) | Same. |
| [src/components/dashboard/nutri-guidance-card.tsx](src/components/dashboard/nutri-guidance-card.tsx) | Update query. |
| [src/lib/commissions.ts](src/lib/commissions.ts) | Update query. |
| [src/lib/feature-quota.ts](src/lib/feature-quota.ts) | Update query (counts active links). |

**Application code (new):**
- `src/lib/links.ts` — RPC wrappers for create/accept/revoke + `useLinks()` hook
- `src/lib/messages.ts` — message CRUD + `useMessages(linkId)` Realtime hook
- `src/lib/goals.ts` — goals CRUD + `usePatientGoals(linkId)` hook
- `src/app/api/nutri/messages/route.ts` — POST/GET
- `src/app/api/nutri/goals/route.ts` — POST/PUT
- `src/app/api/nutri/links/[id]/revoke/route.ts` — POST
- `src/app/nutri/pacientes/pacientes-realtime.tsx` — client subscription wrapper

**Files explicitly NOT modified:**
- [src/middleware.ts](src/middleware.ts) — role gating logic unchanged
- [src/lib/supabase/](src/lib/supabase/) — three clients unchanged
- All other migrations 001–029 — left in place, not edited

---

## Appendix C — Open Questions

**Q1 — Role enum: `nutricionista` → `nutritionist`?**
Current `profiles.role` has values `'user'` / `'nutricionista'`. Plan implies `'patient'` / `'nutritionist'`. Renaming touches the trigger, every middleware check, every page that reads `profile.role`, every onboarding step, and is purely cosmetic. **Recommendation: keep PT values for the role enum** (they're not table names — they're internal discriminators) even though table names go to EN. Override?

**Q2 — Phased migration vs. big-bang?**
§2.7 proposes 5 sequential migrations with old tables surviving for 7 days. Alternative is a single transaction that renames + rewrites all policies. Phased is safer but ~3× the migration files. **Recommendation: phased.** Override?

**Q3 — When the trigger creates a profile for a freshly-signed-up patient who has a pending invite addressed to their email, should it auto-accept?**
Current: `auth/callback` does this. Cleaner alternative: the `handle_new_user` trigger detects pending invites and inserts the link in the same transaction. Avoids the cookie+HTTP round-trip. **Recommendation: leave to the route layer for now** — the trigger should stay minimal. Override?

**Q4 — Storage policies (`nutri-credentials`, `lab-pdfs`, `attachments` buckets).**
Each has 2-4 policies referencing `nutri_patient_links`. Migration 033 must rewrite them. **No question — flagging the cost.**

**Q5 — Existing data in old tables.**
"Only test data exists" was confirmed for the rebuild but `db push` history shows 29 applied migrations against a live `salusai.com.br`. Migration 031's backfill assumes the data is OK to keep. Confirm before running.

**Q6 — Realtime broadcast vs. postgres_changes.**
The `link_id IN (…)` filter for messages requires resubscribing on link set changes. Alternative: use Supabase Broadcast channels keyed by `link_id` and have the server emit on writes. **Recommendation: `postgres_changes` for v1**, broadcast if latency becomes a problem.

---

**Next step:** await `approved` (or per-section feedback) before any application code changes. The migrations file in §2.2 and the RPC bodies in §2.4 will be drafted as actual `.sql` files in the implementation pass, but only once the design above is signed off.
