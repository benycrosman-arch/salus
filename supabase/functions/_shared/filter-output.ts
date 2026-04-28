// Output filter — reject any response that smells like the system prompt
// leaked, an env var, or a key.

const LEAK_PATTERNS: RegExp[] = [
  /ABSOLUTE\s+RULES/i,
  /your\s+only\s+function\s+is/i,
  /these\s+(absolute\s+)?instructions/i,
  /\bSUPABASE_URL\b/i,
  /\bSUPABASE_ANON_KEY\b/i,
  /\bSUPABASE_SERVICE_ROLE_KEY\b/i,
  /\bANTHROPIC_API_KEY\b/i,
  /sk-ant-[a-z0-9_-]+/i,
  /sk_test_[a-z0-9_]+/i,
  /sk_live_[a-z0-9_]+/i,
]

const FALLBACK = "Posso ajudar apenas com nutrição e registro de alimentos."

export type FilterResult = { safe: true; output: string } | { safe: false; reason: string; output: string }

export function filterOutput(text: string): FilterResult {
  for (const pat of LEAK_PATTERNS) {
    if (pat.test(text)) {
      return { safe: false, reason: pat.source, output: FALLBACK }
    }
  }
  return { safe: true, output: text }
}
