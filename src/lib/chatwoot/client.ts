import { isChatwootMocked } from '@/lib/whatsapp/feature-flag'

export interface SendMessageInput {
  conversationId?: number
  contactId?: number
  inboxId?: number
  content: string
  templateName?: string
  templateParams?: Record<string, string>
}

export interface SendMessageResult {
  ok: boolean
  messageId?: number
  conversationId?: number
  error?: string
  mocked?: boolean
}

export interface FindOrCreateContactInput {
  phoneE164: string
  name?: string
}

export interface FindOrCreateContactResult {
  ok: boolean
  contactId?: number
  conversationId?: number
  error?: string
  mocked?: boolean
}

interface ChatwootEnv {
  baseUrl: string
  accountId: string
  inboxId: string
  apiToken: string
}

function readEnv(): ChatwootEnv | null {
  const baseUrl = process.env.CHATWOOT_BASE_URL
  const accountId = process.env.CHATWOOT_ACCOUNT_ID
  const inboxId = process.env.CHATWOOT_INBOX_ID
  const apiToken = process.env.CHATWOOT_API_TOKEN
  if (!baseUrl || !accountId || !inboxId || !apiToken) return null
  return { baseUrl, accountId, inboxId, apiToken }
}

function buildUrl(env: ChatwootEnv, path: string): string {
  const trimmed = env.baseUrl.replace(/\/$/, '')
  return `${trimmed}/api/v1/accounts/${env.accountId}${path}`
}

async function chatwootFetch(env: ChatwootEnv, path: string, init: RequestInit): Promise<Response> {
  return fetch(buildUrl(env, path), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      api_access_token: env.apiToken,
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  })
}

export async function findOrCreateContact(
  input: FindOrCreateContactInput,
): Promise<FindOrCreateContactResult> {
  if (isChatwootMocked()) {
    console.info('[chatwoot:mock] findOrCreateContact', input)
    const stableId = Math.abs(hashString(input.phoneE164)) % 1_000_000
    return { ok: true, contactId: stableId, mocked: true }
  }

  const env = readEnv()
  if (!env) return { ok: false, error: 'Chatwoot env not configured' }

  // Search by phone first.
  const searchRes = await chatwootFetch(
    env,
    `/contacts/search?q=${encodeURIComponent(input.phoneE164)}&include=contact_inboxes`,
    { method: 'GET' },
  )
  if (searchRes.ok) {
    const json = (await searchRes.json()) as { payload?: Array<{ id: number; phone_number?: string }> }
    const hit = json.payload?.find((c) => c.phone_number === input.phoneE164)
    if (hit?.id) return { ok: true, contactId: hit.id }
  }

  // Create.
  const createRes = await chatwootFetch(env, `/contacts`, {
    method: 'POST',
    body: JSON.stringify({
      inbox_id: Number(env.inboxId),
      name: input.name ?? input.phoneE164,
      phone_number: input.phoneE164,
    }),
  })

  if (!createRes.ok) {
    const text = await createRes.text()
    return { ok: false, error: `Chatwoot create contact ${createRes.status}: ${text}` }
  }
  const created = (await createRes.json()) as { payload?: { contact?: { id: number } } }
  const contactId = created.payload?.contact?.id
  if (!contactId) return { ok: false, error: 'Chatwoot did not return contact id' }
  return { ok: true, contactId }
}

async function findOrCreateConversation(
  env: ChatwootEnv,
  contactId: number,
): Promise<{ ok: true; conversationId: number } | { ok: false; error: string }> {
  // Look up existing conversations for this contact.
  const listRes = await chatwootFetch(env, `/contacts/${contactId}/conversations`, { method: 'GET' })
  if (listRes.ok) {
    const json = (await listRes.json()) as { payload?: Array<{ id: number; status: string; inbox_id: number }> }
    const live = json.payload?.find(
      (c) => c.inbox_id === Number(env.inboxId) && (c.status === 'open' || c.status === 'pending'),
    )
    if (live?.id) return { ok: true, conversationId: live.id }
  }

  const createRes = await chatwootFetch(env, `/conversations`, {
    method: 'POST',
    body: JSON.stringify({
      source_id: String(contactId),
      inbox_id: Number(env.inboxId),
      contact_id: contactId,
    }),
  })
  if (!createRes.ok) {
    const text = await createRes.text()
    return { ok: false, error: `Chatwoot create conversation ${createRes.status}: ${text}` }
  }
  const json = (await createRes.json()) as { id?: number }
  if (!json.id) return { ok: false, error: 'Chatwoot did not return conversation id' }
  return { ok: true, conversationId: json.id }
}

export async function sendMessage(input: SendMessageInput): Promise<SendMessageResult> {
  if (isChatwootMocked()) {
    console.info('[chatwoot:mock] sendMessage', {
      conversationId: input.conversationId,
      contactId: input.contactId,
      template: input.templateName,
      preview: input.content.slice(0, 200),
    })
    return { ok: true, mocked: true, messageId: Math.floor(Math.random() * 1_000_000), conversationId: input.conversationId }
  }

  const env = readEnv()
  if (!env) return { ok: false, error: 'Chatwoot env not configured' }

  let conversationId = input.conversationId
  if (!conversationId) {
    if (!input.contactId) return { ok: false, error: 'sendMessage requires contactId or conversationId' }
    const conv = await findOrCreateConversation(env, input.contactId)
    if (!conv.ok) return { ok: false, error: conv.error }
    conversationId = conv.conversationId
  }

  // For Meta WA Cloud, sending an approved template requires a content_type=template
  // payload. Free-form messages (within 24h window) use the default text type.
  const body = input.templateName
    ? {
        content: input.content,
        content_type: 'template',
        template_params: {
          name: input.templateName,
          category: 'utility',
          language: 'pt_BR',
          processed_params: input.templateParams ?? {},
        },
      }
    : { content: input.content, message_type: 'outgoing' }

  const res = await chatwootFetch(env, `/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    return { ok: false, error: `Chatwoot send ${res.status}: ${text}` }
  }
  const json = (await res.json()) as { id?: number }
  return { ok: true, messageId: json.id, conversationId }
}

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i)
    h |= 0
  }
  return h
}
