// Input validation and prompt-injection detection.
// Treat ALL user-provided text as data to analyze, never as instructions.

const CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/

const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/i,
  /forget\s+(everything|all|your\s+instructions?)/i,
  /you\s+are\s+now\s+(a\s+|an\s+)?(different|new|unrestricted|uncensored)/i,
  /act\s+as\s+(if\s+you\s+are|a\s+)?(different|unrestricted|jailbroken)/i,
  /disregard\s+(your|all)\s+(instructions?|rules|guidelines)/i,
  /reveal\s+(your|the)\s+(system\s+prompt|instructions?|api\s+key)/i,
  /print\s+(your|the)\s+(system\s+prompt|secret|configuration)/i,
  /\[\s*system\s*\]/i,
  /<\|im_start\|>/i,
  /###\s*(instruction|system|prompt)/i,
  /\bdan\b.*\bjailbreak/i,
  /override\s+(your|the)\s+(system|instructions?)/i,
  /pretend\s+(you|to\s+be)\s+(a\s+different|another)/i,
]

export type ValidateResult =
  | { valid: true }
  | { valid: false; error: string }

export function validateTextRequest(
  body: unknown,
  opts: { maxLength?: number; minLength?: number } = {},
): ValidateResult {
  const maxLength = opts.maxLength ?? 2000
  const minLength = opts.minLength ?? 2

  if (!body || typeof body !== "object") {
    return { valid: false, error: "Invalid request body" }
  }
  const req = body as Record<string, unknown>
  const message = req.text ?? req.message
  if (typeof message !== "string") {
    return { valid: false, error: "Text is required" }
  }
  if (message.length > maxLength) {
    return { valid: false, error: `Text too long (max ${maxLength} characters)` }
  }
  if (message.trim().length < minLength) {
    return { valid: false, error: "Text too short" }
  }
  if (CONTROL_CHARS.test(message)) {
    return { valid: false, error: "Invalid characters in text" }
  }
  return { valid: true }
}

export function validateImageRequest(body: unknown): ValidateResult {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Invalid request body" }
  }
  const req = body as Record<string, unknown>
  if (typeof req.image !== "string" || !req.image) {
    return { valid: false, error: "Image is required" }
  }
  // Reject anything beyond 8 MB of base64 (~6 MB raw)
  if (req.image.length > 8 * 1024 * 1024) {
    return { valid: false, error: "Image too large (max 6 MB)" }
  }
  return { valid: true }
}

export type SanitizeResult =
  | { safe: true; sanitized: string }
  | { safe: false; reason: string }

/**
 * Detect obvious prompt-injection patterns and refuse the request.
 * On safe input, wraps the text so the LLM treats it as data.
 */
export function sanitizeText(raw: string, prefix = "User input"): SanitizeResult {
  const trimmed = raw.trim().slice(0, 2000)
  for (const pat of INJECTION_PATTERNS) {
    if (pat.test(trimmed)) {
      return { safe: false, reason: pat.source }
    }
  }
  return { safe: true, sanitized: `${prefix}: ${trimmed}` }
}
