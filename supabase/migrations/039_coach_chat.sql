-- ============================================================
-- Salus — In-app AI Coach (the "WhatsApp coach", now inside the app)
--
-- Replaces the WhatsApp delivery channel with a native in-app chat:
--   * coach_conversations  — one thread per saved conversation, so the
--                            paciente can scroll the history and reopen a
--                            specific one (like the Whoop coach).
--   * coach_messages       — the turns inside a conversation.
--   * coach_notifications  — proactive reminders the bot generates. For now
--                            they surface IN-APP (a bell + list shown when the
--                            person opens Salus). The delivered_push flag and
--                            coach_push_tokens table are scaffolding so the same
--                            reminders can fan out as native push once the app
--                            is on the App Store — no schema change needed then.
--   * coach_settings       — per-user reminder prefs + dedupe timestamps.
--   * coach_push_tokens    — APNs/FCM device tokens (future push layer).
--
-- Purely additive. Reuses the same profiles / meals / goals tables that feed
-- the dashboard, so the coach's view matches what the user sees.
-- ============================================================

-- ---------- Conversations -----------------------------------
create table if not exists coach_conversations (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  -- Auto-derived from the first user message; the paciente can rename.
  title           text check (char_length(coalesce(title, '')) <= 200),
  archived        boolean not null default false,
  last_message_at timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_coach_conversations_user_recent
  on coach_conversations(user_id, archived, last_message_at desc);

-- ---------- Messages ----------------------------------------
create table if not exists coach_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references coach_conversations(id) on delete cascade,
  -- Denormalized so RLS is a simple owner check without a join.
  user_id         uuid not null references auth.users(id) on delete cascade,
  role            text not null check (role in ('user','assistant')),
  content         text not null check (char_length(content) between 1 and 8000),
  -- token usage / model / slot for nudges, etc.
  metadata        jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists idx_coach_messages_conversation
  on coach_messages(conversation_id, created_at);

-- ---------- In-app notifications (reminders) ----------------
create table if not exists coach_notifications (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  -- 'reminder_lunch' | 'reminder_dinner' | 'reminder_recap' | 'reminder_hydration' | 'coach'
  kind            text not null,
  title           text not null check (char_length(title) between 1 and 200),
  body            text not null check (char_length(body) between 1 and 2000),
  -- Optional deep-link target: tapping the reminder opens this coach thread.
  conversation_id uuid references coach_conversations(id) on delete set null,
  read_at         timestamptz,
  -- Future: set true once also delivered as a native push.
  delivered_push  boolean not null default false,
  created_at      timestamptz not null default now()
);

create index if not exists idx_coach_notifications_user_recent
  on coach_notifications(user_id, created_at desc);
create index if not exists idx_coach_notifications_unread
  on coach_notifications(user_id) where read_at is null;

-- ---------- Per-user coach settings -------------------------
create table if not exists coach_settings (
  user_id           uuid primary key references auth.users(id) on delete cascade,
  reminders_enabled boolean not null default true,
  timezone          text not null default 'America/Sao_Paulo',
  -- Dedupe: the cron only sends a given slot once per local day.
  last_reminder_at  timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ---------- Future native-push device tokens ----------------
create table if not exists coach_push_tokens (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  platform   text not null check (platform in ('ios','android','web')),
  token      text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, token)
);

-- ============================================================
-- RLS — every table is strictly per-user. The cron writes
-- notifications via the service-role client (bypasses RLS).
-- ============================================================
alter table coach_conversations enable row level security;
alter table coach_messages       enable row level security;
alter table coach_notifications  enable row level security;
alter table coach_settings        enable row level security;
alter table coach_push_tokens     enable row level security;

create policy "coach_conversations_owner"
  on coach_conversations for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Messages: owner reads/writes their own. The API sets `role` correctly
-- (assistant rows are written server-side in the same authenticated request).
create policy "coach_messages_owner"
  on coach_messages for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Notifications: the user can read them and mark them read; inserts come from
-- the cron (service role). No client insert policy on purpose.
create policy "coach_notifications_read"
  on coach_notifications for select
  using (user_id = auth.uid());
create policy "coach_notifications_update"
  on coach_notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "coach_settings_owner"
  on coach_settings for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "coach_push_tokens_owner"
  on coach_push_tokens for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------- updated_at touch triggers -----------------------
create or replace function coach_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_coach_conversations_updated_at on coach_conversations;
create trigger trg_coach_conversations_updated_at
  before update on coach_conversations
  for each row execute function coach_touch_updated_at();

drop trigger if exists trg_coach_settings_updated_at on coach_settings;
create trigger trg_coach_settings_updated_at
  before update on coach_settings
  for each row execute function coach_touch_updated_at();

drop trigger if exists trg_coach_push_tokens_updated_at on coach_push_tokens;
create trigger trg_coach_push_tokens_updated_at
  before update on coach_push_tokens
  for each row execute function coach_touch_updated_at();

notify pgrst, 'reload schema';
