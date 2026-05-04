/**
 * Admin email allowlist. Users whose email matches this list bypass the nutri
 * verification gate and the role-based area gate, so the founder/team can
 * preview the nutri dashboard without submitting CRN credentials.
 *
 * Defaults to the founder's email; override at runtime by setting the
 * ADMIN_EMAILS environment variable to a comma-separated list. NOT exposed
 * client-side: this module is server-only and read by middleware + server
 * components only.
 *
 * IMPORTANT: this only bypasses *frontend gates*. RLS in Supabase still
 * applies — an admin sees only their own data, not other nutris' patients.
 */

const DEFAULT_ADMIN_EMAILS = ['benycrosman@gmail.com']

function adminEmailList(): string[] {
  const raw = process.env.ADMIN_EMAILS
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    return DEFAULT_ADMIN_EMAILS
  }
  const parsed = raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0)
  return parsed.length > 0 ? parsed : DEFAULT_ADMIN_EMAILS
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return adminEmailList().includes(email.toLowerCase())
}
