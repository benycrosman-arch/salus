import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Column-aware helpers for the `nutri_invites` table.
 *
 * Why this exists: the live DB drifted from migration history at some point —
 * the canonical column is `patient_email`, but in some environments it's still
 * the legacy `email` (migration 014's rename never ran, or PostgREST's schema
 * cache is stale). Rather than crash the entire invite/dashboard flow on that
 * drift, we probe once per process, cache the working column name, and
 * normalize the row shape so callers always see `patient_email`.
 *
 * Once `npx supabase db push` lands migration 027 everywhere, this falls into
 * its happy path forever — the fallback branch is just defense in depth.
 */

export type InviteRow = {
  id: string
  nutri_id?: string
  patient_email: string
  token?: string
  status?: string
  created_at?: string
  expires_at: string
}

type EmailColumn = 'patient_email' | 'email'

let cachedColumn: EmailColumn | null = null
let probePromise: Promise<EmailColumn> | null = null

/**
 * Strict — only matches PostgREST's "schema cache" PGRST204 family.
 * Looser substrings ('could not find') match RLS / trigger errors and would
 * cause us to flip column names for the wrong reason.
 */
function isSchemaCacheError(message: string | undefined): boolean {
  if (!message) return false
  return message.toLowerCase().includes('schema cache')
}

async function probeColumn(supabase: SupabaseClient): Promise<EmailColumn> {
  // limit(0) returns no rows but PostgREST still validates the projection
  // against the schema cache, so a missing column raises PGRST204.
  const { error } = await supabase.from('nutri_invites').select('patient_email').limit(0)
  if (!error) return 'patient_email'
  if (isSchemaCacheError(error.message)) return 'email'
  // Some other error (RLS denial during probe). Default to canonical and let
  // the per-call retry handle the unlucky case where it's actually wrong.
  return 'patient_email'
}

export async function getInviteEmailColumn(supabase: SupabaseClient): Promise<EmailColumn> {
  if (cachedColumn) return cachedColumn
  if (!probePromise) {
    probePromise = probeColumn(supabase)
      .then((c) => {
        cachedColumn = c
        return c
      })
      .catch((err) => {
        // Don't poison the cache on a failed probe — let the next caller retry.
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

function projectionFor(col: EmailColumn, canonical: string): string {
  if (col === 'patient_email') return canonical
  return canonical
    .split(',')
    .map((s) => s.trim())
    .map((s) => (s === 'patient_email' ? 'email' : s))
    .join(', ')
}

/**
 * Run an op with the cached column name; if it fails with a schema-cache
 * error, retry once with the alt column. Only commit the cache flip when the
 * retry actually SUCCEEDS — otherwise a transient error would poison the
 * cache for the lifetime of the process.
 */
async function withColumnRetry<T extends { error: { message: string } | null }>(
  supabase: SupabaseClient,
  run: (col: EmailColumn) => Promise<T>,
): Promise<T> {
  const col = await getInviteEmailColumn(supabase)
  const first = await run(col)
  if (!first.error || !isSchemaCacheError(first.error.message)) return first

  const altCol: EmailColumn = col === 'patient_email' ? 'email' : 'patient_email'
  const second = await run(altCol)
  if (!second.error) {
    cachedColumn = altCol
  }
  return second
}

/**
 * Insert a new invite. Caller passes the canonical shape; we translate at the
 * boundary. Returns the row in canonical shape.
 */
export async function insertInvite(
  supabase: SupabaseClient,
  args: { nutri_id: string; patient_email: string },
): Promise<{ data: InviteRow | null; error: { message: string; code?: string } | null }> {
  const canonical = 'id, token, patient_email, status, created_at, expires_at, nutri_id'
  const res = await withColumnRetry(supabase, async (col) => {
    const projection = projectionFor(col, canonical)
    const payload =
      col === 'patient_email'
        ? { nutri_id: args.nutri_id, patient_email: args.patient_email }
        : { nutri_id: args.nutri_id, email: args.patient_email }
    return supabase.from('nutri_invites').insert(payload).select(projection).single()
  })
  return {
    data: normalize(res.data as Record<string, unknown> | null),
    error: res.error as { message: string; code?: string } | null,
  }
}

/**
 * List invites for a nutri (most-recent first).
 */
export async function listInvitesForNutri(
  supabase: SupabaseClient,
  nutri_id: string,
  limit = 50,
): Promise<{ data: InviteRow[]; error: { message: string } | null }> {
  const canonical = 'id, patient_email, status, created_at, expires_at, token, nutri_id'
  const res = await withColumnRetry(supabase, async (col) => {
    const projection = projectionFor(col, canonical)
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

/**
 * Look up a single invite by token. Used by the public landing + accept route.
 * Token is forced to lowercase so an uppercase URL still resolves.
 */
export async function getInviteByToken(
  supabase: SupabaseClient,
  token: string,
): Promise<{ data: InviteRow | null; error: { message: string } | null }> {
  const canonical = 'id, nutri_id, patient_email, status, expires_at, token, created_at'
  const normalizedToken = token.toLowerCase()
  const res = await withColumnRetry(supabase, async (col) => {
    const projection = projectionFor(col, canonical)
    return supabase.from('nutri_invites').select(projection).eq('token', normalizedToken).maybeSingle()
  })
  return { data: normalize(res.data as Record<string, unknown> | null), error: res.error }
}

/**
 * Count invites issued by a nutri since a given timestamp. Used by the
 * per-nutri abuse guard.
 */
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

/**
 * Returns true if there's already a pending, non-expired invite from this
 * nutri to this email. Prevents accidental spam (duplicate-tap on the
 * "Enviar convite" button). Uses the same column-retry path so a stale
 * cache can't make this guard silently fail open.
 *
 * Note: this is a best-effort pre-check. The migration-028 partial unique
 * index is the actual race-proof guarantee — caller must also handle 23505.
 */
export async function hasPendingInviteFor(
  supabase: SupabaseClient,
  nutri_id: string,
  patient_email: string,
): Promise<boolean> {
  const nowIso = new Date().toISOString()
  const res = await withColumnRetry(supabase, async (col) => {
    return supabase
      .from('nutri_invites')
      .select('id', { count: 'exact', head: true })
      .eq('nutri_id', nutri_id)
      .eq(col, patient_email)
      .eq('status', 'pending')
      .gt('expires_at', nowIso)
  })
  if (res.error) return false
  return (res.count ?? 0) > 0
}
