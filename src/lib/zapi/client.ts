import { isZapiMocked } from '@/lib/whatsapp/feature-flag'

/**
 * Z-API client. Z-API is a non-official WhatsApp Web gateway popular in Brazil.
 *
 * Endpoints (REST):
 *   POST /instances/{instance}/token/{token}/send-text
 *   POST /instances/{instance}/token/{token}/send-image
 *
 * All authenticated requests must carry a `Client-Token` header (separate from
 * the `{token}` in the URL — that one identifies the instance, this one is
 * an account-level secret used to sign every call).
 *
 * Phone numbers are E.164 without the leading `+` (e.g. 5511988887777).
 */

interface ZapiEnv {
  instanceId: string
  token: string
  clientToken: string
  baseUrl: string
}

function readEnv(): ZapiEnv | null {
  const instanceId = process.env.ZAPI_INSTANCE_ID
  const token = process.env.ZAPI_TOKEN
  const clientToken = process.env.ZAPI_CLIENT_TOKEN
  if (!instanceId || !token || !clientToken) return null
  return {
    instanceId,
    token,
    clientToken,
    baseUrl: (process.env.ZAPI_BASE_URL || 'https://api.z-api.io').replace(/\/$/, ''),
  }
}

function buildUrl(env: ZapiEnv, path: string): string {
  return `${env.baseUrl}/instances/${env.instanceId}/token/${env.token}${path}`
}

async function zapiFetch(env: ZapiEnv, path: string, body: unknown): Promise<Response> {
  return fetch(buildUrl(env, path), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Client-Token': env.clientToken,
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
}

/** Strip a leading `+` and any non-digits for the Z-API `phone` field. */
function toZapiPhone(phoneE164: string): string {
  return phoneE164.replace(/[^\d]/g, '')
}

export interface SendTextInput {
  phoneE164: string
  message: string
}

export interface SendResult {
  ok: boolean
  messageId?: string
  error?: string
  mocked?: boolean
}

export async function sendText(input: SendTextInput): Promise<SendResult> {
  if (isZapiMocked()) {
    console.info('[zapi:mock] sendText', {
      phone: input.phoneE164,
      preview: input.message.slice(0, 200),
    })
    return { ok: true, mocked: true, messageId: `mock_${Date.now()}` }
  }

  const env = readEnv()
  if (!env) return { ok: false, error: 'Z-API env not configured' }

  const res = await zapiFetch(env, '/send-text', {
    phone: toZapiPhone(input.phoneE164),
    message: input.message,
  })

  if (!res.ok) {
    const text = await res.text()
    return { ok: false, error: `Z-API send-text ${res.status}: ${text.slice(0, 200)}` }
  }

  const json = (await res.json().catch(() => ({}))) as {
    messageId?: string
    id?: string
    zaapId?: string
  }
  return { ok: true, messageId: json.messageId ?? json.id ?? json.zaapId }
}

export interface SendImageInput {
  phoneE164: string
  /** HTTPS URL or `data:image/...;base64,...` payload. */
  image: string
  caption?: string
}

export async function sendImage(input: SendImageInput): Promise<SendResult> {
  if (isZapiMocked()) {
    console.info('[zapi:mock] sendImage', {
      phone: input.phoneE164,
      caption: input.caption?.slice(0, 80),
    })
    return { ok: true, mocked: true, messageId: `mock_${Date.now()}` }
  }

  const env = readEnv()
  if (!env) return { ok: false, error: 'Z-API env not configured' }

  const res = await zapiFetch(env, '/send-image', {
    phone: toZapiPhone(input.phoneE164),
    image: input.image,
    caption: input.caption ?? '',
  })

  if (!res.ok) {
    const text = await res.text()
    return { ok: false, error: `Z-API send-image ${res.status}: ${text.slice(0, 200)}` }
  }

  const json = (await res.json().catch(() => ({}))) as {
    messageId?: string
    id?: string
    zaapId?: string
  }
  return { ok: true, messageId: json.messageId ?? json.id ?? json.zaapId }
}

const MAX_IMAGE_BYTES = 10 * 1024 * 1024

/**
 * Fetch an inbound image from Z-API. The webhook payload includes a public
 * `imageUrl` (Z-API's CDN). We still constrain to the configured Z-API CDN
 * host as defense-in-depth against SSRF if a malicious webhook spoofed us.
 */
export async function fetchInboundImage(
  imageUrl: string,
): Promise<{ base64: string; mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' } | null> {
  if (!isAllowedImageHost(imageUrl)) {
    console.warn('[zapi] refused image fetch — host not allowlisted', { imageUrl })
    return null
  }
  try {
    const res = await fetch(imageUrl, { cache: 'no-store' })
    if (!res.ok) return null
    const contentType = res.headers.get('content-type') ?? 'image/jpeg'
    if (!contentType.startsWith('image/')) return null
    const mediaType = ((): 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' => {
      if (contentType.includes('png')) return 'image/png'
      if (contentType.includes('webp')) return 'image/webp'
      if (contentType.includes('gif')) return 'image/gif'
      return 'image/jpeg'
    })()
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length === 0 || buf.length > MAX_IMAGE_BYTES) return null
    return { base64: buf.toString('base64'), mediaType }
  } catch {
    return null
  }
}

function isAllowedImageHost(rawUrl: string): boolean {
  try {
    const u = new URL(rawUrl)
    if (u.protocol !== 'https:') return false
    // Z-API serves media from these hosts. Update if Z-API changes its CDN.
    const allowed = [
      'api.z-api.io',
      'storage.z-api.io',
      'z-api.io',
    ]
    if (allowed.some((h) => u.host === h || u.host.endsWith(`.${h}`))) return true
    // WhatsApp's own CDN sometimes appears in Z-API payloads.
    if (u.host.endsWith('.whatsapp.net') || u.host.endsWith('.cdninstagram.com')) return true
    return false
  } catch {
    return false
  }
}
