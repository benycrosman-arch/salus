// CORS allowlist for Edge Functions.
// Web origins only — native Expo fetch() doesn't send Origin and skips CORS.

const ALLOWED_ORIGINS = [
  "https://salus.nulllabs.org",
  "https://www.salus.nulllabs.org",
  "https://nulllabs.org",
  "https://nutrigen-psi.vercel.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]

export function corsHeaders(requestOrigin: string | null): Record<string, string> {
  const allowed = requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)
    ? requestOrigin
    : ALLOWED_ORIGINS[0]
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  }
}

export function jsonResponse(
  body: unknown,
  status: number,
  origin: string | null,
  extra: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(origin),
      "Content-Type": "application/json",
      ...extra,
    },
  })
}
