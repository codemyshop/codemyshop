

import { resolveClientId } from './db'

export interface PsTenantConfig {
  clientId: string
  envKey: string
  apiUrl: string
  apiKey: string
  cookieKey: string
  hostHeader: string
  

  internalUrl: string
}

export function clientIdToEnvKey(clientId: string): string {
  return clientId
    .toUpperCase()
    .replace(/-/g, '_')
}

export function resolveTenantClientId(event: any): string {
  try {
    const cfg = useRuntimeConfig(event)
    const fromCfg = (cfg.clientId as string | undefined) || ''
    if (fromCfg && fromCfg !== 'ac-hub') return fromCfg
  } catch {  }
  return resolveClientId(event)
}

export function getTenantPsConfig(event: any): PsTenantConfig {
  const clientId = resolveTenantClientId(event)
  const envKey = clientIdToEnvKey(clientId)

  const env = process.env
  let apiUrl = env[`PS_URL_${envKey}`] || ''
  let apiKey = env[`PS_API_KEY_${envKey}`] || ''
  let cookieKey = env[`PS_COOKIE_KEY_${envKey}`] || ''
  let hostHeader = env[`PS_HOST_${envKey}`] || ''

  
  if (!apiUrl || !hostHeader) {
    try {
      const cfg = useRuntimeConfig(event)
      if (!apiUrl && cfg.psBaseUrl) apiUrl = cfg.psBaseUrl as string
      if (!hostHeader && cfg.psHost) hostHeader = cfg.psHost as string
    } catch {  }
  }

  
  if (!hostHeader) hostHeader = env.PS_HOST || env.NUXT_PS_HOST || ''

  
  if (!hostHeader && apiUrl) {
    try { hostHeader = new URL(apiUrl).host } catch {  }
  }

  
  
  const internalUrl = env[`PS_INTERNAL_URL_${envKey}`] || apiUrl

  return { clientId, envKey, apiUrl, apiKey, cookieKey, hostHeader, internalUrl }
}
