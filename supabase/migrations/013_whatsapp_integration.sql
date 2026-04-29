-- ============================================================
-- Salus — WhatsApp + AI Coach (via Chatwoot)
-- Purely additive: only NEW tables. No changes to existing tables.
-- Safe to apply on a live DB; if rolled back, drop these two tables.
-- ============================================================

-- Per-user link state. Separate from profiles so the feature can be
-- ripped out cleanly if needed.
create table if not exists whatsapp_connections (
  user_id                  uuid primary key references auth.users(id) on delete cascade,
  phone_e164               text not null,
  chatwoot_contact_id      integer,
  chatwoot_conversation_id integer,
  status                   text not null default 'pending'
    check (status in ('pending','verified','disabled')),
  verification_code_hash   text,
  verification_sent_at     timestamptz,
  verification_attempts    integer not null default 0,
  verified_at              timestamptz,
  opt_in_at                timestamptz,
  timezone                 text not null default 'America/Sao_Paulo',
  nudge_lunch_enabled      boolean not null default true,
  nudge_dinner_enabled     boolean not null default true,
  nudge_recap_enabled      boolean not null default true,
  last_message_at          timestamptz,
  last_nudge_lunch_at      timestamptz,
  last_nudge_dinner_at     timestamptz,
  last_nudge_recap_at      timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create unique index if not exists whatsapp_connections_phone_idx
  on whatsapp_connections(phone_e164);
create index if not exists whatsapp_connections_chatwoot_contact_idx
  on whatsapp_connections(chatwoot_contact_id);
create index if not exists whatsapp_connections_status_idx
  on whatsapp_connections(status) where status = 'verified';

-- Mirrored conversation log. Lets the agent load recent context fast
-- without round-tripping Chatwoot, and gives us an audit trail.
create table if not exists whatsapp_messages (
  id                  bigserial primary key,
  user_id             uuid not null references auth.users(id) on delete cascade,
  direction           text not null check (direction in ('inbound','outbound')),
  content             text not null,
  source              text not null,
  chatwoot_message_id integer,
  metadata            jsonb,
  created_at          timestamptz not null default now()
);

create index if not exists whatsapp_messages_user_recent_idx
  on whatsapp_messages(user_id, created_at desc);

-- RLS: users only read their own rows. Writes happen from server-side
-- routes using the service role key (which bypasses RLS).
alter table whatsapp_connections enable row level security;
alter table whatsapp_messages    enable row level security;

drop policy if exists whatsapp_connections_self_read on whatsapp_connections;
create policy whatsapp_connections_self_read
  on whatsapp_connections for select
  using (auth.uid() = user_id);

drop policy if exists whatsapp_messages_self_read on whatsapp_messages;
create policy whatsapp_messages_self_read
  on whatsapp_messages for select
  using (auth.uid() = user_id);

-- Touch updated_at on row changes.
create or replace function set_whatsapp_connections_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_whatsapp_connections_updated_at on whatsapp_connections;
create trigger trg_whatsapp_connections_updated_at
  before update on whatsapp_connections
  for each row execute procedure set_whatsapp_connections_updated_at();
