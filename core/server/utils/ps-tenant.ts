/**
 *
 * Multi-tenant resolution of PrestaShop config on Nuxt server side.
 *
 * Source of truth per tenant:
 * 1. runtimeConfig.clientId (defined by each tenant in its nuxt.config.ts)
 * 2. fallback hostname → resolveClientId(event) (multi-tenant case on same Nuxt)
 *
 * Variables d'env attendues (par client) :
 *   PS_URL_<KEY>         → http(s)://host[:port]/api
 * PS_API_KEY_<KEY>     → webservice key
 * PS_COOKIE_KEY_<KEY>  → PS cookie_key for MD5 legacy
 * PS_HOST_<KEY>        → optional, vhost to force in Host header (internal Docker)
 *
 * <KEY> = clientId.toUpperCase().replace(-v2, '').replace(/-/g, '_')
 *   ex: 'my-shop' / 'my-shop-v2'  → 'MY_SHOP'
 *       'demo'                    → 'DEMO'
 */
import { resolveClientId } from './db'

export interface PsTenantConfig {
  clientId: string
  envKey: string
  apiUrl: string
  apiKey: string
  cookieKey: string
  hostHeader: string
  /**
   * Internal URL of the PS container (e.g., http://127.0.0.1:8080), used for
   * server-to-server calls when PS is not publicly exposed
   * (typically when public nginx only proxies Nuxt). Fallback to apiUrl.
   */
  internalUrl: string
}

/** Normalise un clientId vers la convention env var (uppercase, tirets → underscores). */
export function clientIdToEnvKey(clientId: string): string {
  return clientId
    .toUpperCase()
    .replace(/-/g, '_')
}

/**
 * Resolves the effective clientId for a request.
 * Prefers runtimeConfig.clientId (canonical on dedicated VPS) over hostname fallback.
 */
export function resolveTenantClientId(event: any): string {
  try {
    const cfg = useRuntimeConfig(event)
    const fromCfg = (cfg.clientId as string | undefined) || ''
    if (fromCfg && fromCfg !== 'ac-hub') return fromCfg
  } catch { /* pas d'event */ }
  return resolveClientId(event)
}

/**
 * Loads PS config for the current tenant — env vars first, fallback to runtimeConfig
 * for the legacy Hub configuration case (psBaseUrl/psHost in nuxt.config).
 */
export function getTenantPsConfig(event: any): PsTenantConfig {
  const clientId = resolveTenantClientId(event)
  const envKey = clientIdToEnvKey(clientId)

  const env = process.env
  let apiUrl = env[`PS_URL_${envKey}`] || ''
  let apiKey = env[`PS_API_KEY_${envKey}`] || ''
  let cookieKey = env[`PS_COOKIE_KEY_${envKey}`] || ''
  let hostHeader = env[`PS_HOST_${envKey}`] || ''

  // Fallback AC Hub : runtimeConfig historique
  if (!apiUrl || !hostHeader) {
    try {
      const cfg = useRuntimeConfig(event)
      if (!apiUrl && cfg.psBaseUrl) apiUrl = cfg.psBaseUrl as string
      if (!hostHeader && cfg.psHost) hostHeader = cfg.psHost as string
    } catch { /* noop */ }
  }

  // Dernier filet : PS_HOST global (mono-tenant historique)
  if (!hostHeader) hostHeader = env.PS_HOST || env.NUXT_PS_HOST || ''

  // If still no hostHeader and apiUrl is public (https), use the hostname from the URL
  if (!hostHeader && apiUrl) {
    try { hostHeader = new URL(apiUrl).host } catch { /* noop */ }
  }

  // Internal URL (server-to-server): prefer PS_INTERNAL_URL_<KEY>, otherwise apiUrl.
  // On V2 (PS not publicly exposed), apiUrl is incorrect — only internalUrl works.
  const internalUrl = env[`PS_INTERNAL_URL_${envKey}`] || apiUrl

  return { clientId, envKey, apiUrl, apiKey, cookieKey, hostHeader, internalUrl }
}
