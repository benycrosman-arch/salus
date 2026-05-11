export function isWhatsAppFeatureEnabled(): boolean {
  return process.env.WHATSAPP_FEATURE_ENABLED === 'true'
}

export function isZapiMocked(): boolean {
  // Default to mocked when MOCK_ZAPI is set or no real instance is configured —
  // protects accidental live calls in dev.
  if (process.env.MOCK_ZAPI === 'true') return true
  if (!process.env.ZAPI_INSTANCE_ID || !process.env.ZAPI_TOKEN || !process.env.ZAPI_CLIENT_TOKEN) return true
  return false
}
