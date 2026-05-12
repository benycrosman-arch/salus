import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Column-aware helpers for the `nutri_invites` table.
 *
 * Why this exists: the live DB has drifted from migration files multiple
 * times. The canonical column is `patient_email`, but legacy envs still have
 * `email` (migration 014 didn't run). Migration 029 added `code_hash` and
 * `code_attempts`, which may not be present on every env yet either.
 *
 * On first call we probe what the DB actually has and cache the answer for
 * the lifetime of the Vercel instance. Inserts/selects route through the
 * detected shape, so the app keeps working through partial deploys.
 *
 * Once `npx supabase db push` lands migrations 027/029 everywhere, every
 * probe lands on the canonical happy path forever.
 */

export type InviteRow = {
  id: string
  nutri_id?: string
  patient_email: string
  token?: string
  status?: string
  created_at?: string
  expires_at: string
  code_hash?: string | null
  code_attempts?: number
}

type EmailColumn = 'patient_email' | 'email'
type SchemaShape = { emailCol: EmailColumn; hasCodeColumns: boolean }

let cachedShape: SchemaShape | null = null
let probePromise: Promise<SchemaShape> | null = null

function isSchemaCacheError(message: string | undefined): boolean {
  if (!message) return false
  return message.toLowerCase().includes('schema cache')
}

async function probeShape(supabase: SupabaseClient): Promise<SchemaShape> {
  // Most-canonical first; fall back through the matrix on schema-cache errors.
  // limit(0) returns no rows but still validates the projection.
  const r1 = await supabase.from('nutri_invites').select('patient_email, code_hash').limit(0)
  if (!r1.error) return { emailCol: 'patient_email', hasCodeColumns: true }

  const r2 = await supabase.from('nutri_invites').select('patient_email').limit(0)
  if (!r2.error) return { emailCol: 'patient_email', hasCodeColumns: false }

  const r3 = await supabase.from('nutri_invites').select('email, code_hash').limit(0)
  if (!r3.error) return { emailCol: 'email', hasCodeColumns: true }

  const r4 = await supabase.from('nutri_invites').select('email').limit(0)
  if (!r4.error) return { emailCol: 'email', hasCodeColumns: false }

  // All probes failed — likely RLS blocking the entire table during probe.
  // Default to canonical and let per-call retry handle it if we guessed wrong.
  return { emailCol: 'patient_email', hasCodeColumns: true }
}

export async function getInviteShape(supabase: SupabaseClient): Promise<SchemaShape> {
  if (cachedShape) return cachedShape
  if (!probePromise) {
    probePromise = probeShape(supabase)
      .then((s) => {
        cachedShape = s
        return s
      })
      .catch((err) => {
        probePromise = null
        throw err
      })
  }
  return probePromise
}

function normalize(row: Record<string, unknown> | null): InviteRow | null {
  if (!row) return null
  const out: Record<string, unknown> = { ...row }
  if (!('patient_email' in out) && 'email' in out) {
    out.patient_email = out.email
    delete out.email
  }
  return out as unknown as InviteRow
}

function projectionFor(shape: SchemaShape, canonical: string): string {
  const parts = canonical.split(',').map((s) => s.trim())
  return parts
    .map((s) => {
      if (s === 'patient_email' && shape.emailCol === 'email') return 'email'
      if ((s === 'code_hash' || s === 'code_attempts') && !shape.hasCodeColumns) return null
      return s
    })
    .filter((s): s is string => s !== null)
    .join(', ')
}

/**
 * Run an op with the cached shape; if it fails with a schema-cache error,
 * invalidate the cache and retry once with a fresh probe. Only commit cache
 * updates when the retry actually SUCCEEDS — otherwise a transient error
 * would poison the cache for the lifetime of the process.
 */
async function withShapeRetry<T extends { error: { message: string } | null }>(
  supabase: SupabaseClient,
  run: (shape: SchemaShape) => Promise<T>,
): Promise<T> {
  const shape = await getInviteShape(supabase)
  const first = await run(shape)
  if (!first.error || !isSchemaCacheError(first.error.message)) return first

  // Force a re-probe on the second pass.
  cachedShape = null
  probePromise = null
  const fresh = await getInviteShape(supabase)
  return run(fresh)
}

export async function insertInvite(
  supabase: SupabaseClient,
  args: {
    nutri_id: string
    patient_email: string
    code_hash?: string | null
    expires_at?: string
  },
): Promise<{ data: InviteRow | null; error: { message: string; code?: string } | null }> {
  const canonical = 'id, token, patient_email, status, created_at, expires_at, nutri_id'
  const res = await withShapeRetry(supabase, async (shape) => {
    const projection = projectionFor(shape, canonical)
    const payload: Record<string, unknown> = {
      nutri_id: args.nutri_id,
      [shape.emailCol]: args.patient_email,
    }
    if (args.expires_at !== undefined) payload.expires_at = args.expires_at
    if (args.code_hash !== undefined && shape.hasCodeColumns) {
      payload.code_hash = args.code_hash
    }
    return supabase.from('nutri_invites').insert(payload).select(projection).single()
  })
  return {
    data: normalize(res.data as Record<string, unknown> | null),
    error: res.error as { message: string; code?: string } | null,
  }
}

export async function listInvitesForNutri(
  supabase: SupabaseClient,
  nutri_id: string,
  limit = 50,
): Promise<{ data: InviteRow[]; error: { message: string } | null }> {
  const canonical = 'id, patient_email, status, created_at, expires_at, token, nutri_id'
  const res = await withShapeRetry(supabase, async (shape) => {
    const projection = projectionFor(shape, canonical)
    return supabase
      .from('nutri_invites')
      .select(projection)
      .eq('nutri_id', nutri_id)
      .order('created_at', { ascending: false })
      .limit(limit)
  })
  const rows = ((res.data as Record<string, unknown>[] | null) ?? []).map(
    (r) => normalize(r) as InviteRow,
  )
  return { data: rows, error: res.error }
}

export async function getInviteByToken(
  supabase: SupabaseClient,
  token: string,
): Promise<{ data: InviteRow | null; error: { message: string } | null }> {
  const canonical =
    'id, nutri_id, patient_email, status, expires_at, token, created_at, code_hash, code_attempts'
  const normalizedToken = token.toLowerCase()
  const res = await withShapeRetry(supabase, async (shape) => {
    const projection = projectionFor(shape, canonical)
    return supabase.from('nutri_invites').select(projection).eq('token', normalizedToken).maybeSingle()
  })
  return { data: normalize(res.data as Record<string, unknown> | null), error: res.error }
}

export async function countInvitesSince(
  supabase: SupabaseClient,
  nutri_id: string,
  sinceIso: string,
): Promise<number> {
  const { count } = await supabase
    .from('nutri_invites')
    .select('id', { count: 'exact', head: true })
    .eq('nutri_id', nutri_id)
    .gte('created_at', sinceIso)
  return count ?? 0
}

export async function hasPendingInviteFor(
  supabase: SupabaseClient,
  nutri_id: string,
  patient_email: string,
): Promise<boolean> {
  const nowIso = new Date().toISOString()
  const res = await withShapeRetry(supabase, async (shape) => {
    return supabase
      .from('nutri_invites')
      .select('id', { count: 'exact', head: true })
      .eq('nutri_id', nutri_id)
      .eq(shape.emailCol, patient_email)
      .eq('status', 'pending')
      .gt('expires_at', nowIso)
  })
  if (res.error) return false
  return (res.count ?? 0) > 0
}

/**
 * Bump code_attempts and optionally lock the invite. Best-effort — failure
 * just means the next attempt also gets counted, which is fine.
 */
export async function recordCodeAttempt(
  supabase: SupabaseClient,
  inviteId: string,
  newAttemptCount: number,
  lock: boolean,
): Promise<void> {
  const shape = await getInviteShape(supabase)
  if (!shape.hasCodeColumns) return
  const update: Record<string, unknown> = { code_attempts: newAttemptCount }
  if (lock) update.status = 'expired'
  await supabase.from('nutri_invites').update(update).eq('id', inviteId)
}
