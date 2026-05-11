-- ============================================================
-- Salus — WhatsApp provider migration: Chatwoot/Meta → Z-API
--
-- Z-API uses the E.164 phone as the conversation identifier (no
-- contact_id / conversation_id concepts), and message ids are
-- opaque strings (not integers). So we drop the chatwoot_* int
-- columns and add a single zapi_message_id text column on the
-- message log. The whatsapp_connections table loses all its
-- chatwoot_* fields outright — phone_e164 is already the key.
--
-- Safe to apply on a live DB: any pre-existing chatwoot ids
-- aren't meaningful in Z-API anyway.
-- ============================================================

-- Connections: drop Chatwoot identifiers + their index.
drop index if exists whatsapp_connections_chatwoot_contact_idx;
alter table whatsapp_connections
  drop column if exists chatwoot_contact_id,
  drop column if exists chatwoot_conversation_id;

-- Messages: chatwoot_message_id (int) → zapi_message_id (text).
alter table whatsapp_messages
  drop column if exists chatwoot_message_id;
alter table whatsapp_messages
  add column if not exists zapi_message_id text;

-- Weekly recap dedupe column.
alter table whatsapp_connections
  add column if not exists last_weekly_report_at timestamptz;
