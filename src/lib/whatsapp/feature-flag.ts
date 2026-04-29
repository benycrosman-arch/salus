export function isWhatsAppFeatureEnabled(): boolean {
  return process.env.WHATSAPP_FEATURE_ENABLED === 'true'
}

export function isChatwootMocked(): boolean {
  // Default to mocked when the feature is off or no real base URL is set —
  // protects accidental live calls in dev.
  if (process.env.MOCK_CHATWOOT === 'true') return true
  if (!process.env.CHATWOOT_BASE_URL) return true
  return false
}
