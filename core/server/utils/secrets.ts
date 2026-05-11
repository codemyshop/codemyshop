

import { encrypt, decrypt } from './api-keys'
import { getKnownTenantClientIds } from './db'
import {
  getClientConfigJson,
  upsertClientConfigJson,
} from '~/internal/clientconfig/server/utils/clientconfig'

const GLOBAL_CLIENT_ID = '_global'

interface GlobalConfigShape {
  secrets?: Record<string, string>  
  [key: string]: unknown
}

type FacadeContext = { global?: boolean; clientId?: string }

async function readGlobalRowFrom(ctx: FacadeContext): Promise<GlobalConfigShape> {
  const json = await getClientConfigJson(GLOBAL_CLIENT_ID, ctx)
  if (!json) return {}
  try {
    return JSON.parse(json) as GlobalConfigShape
  } catch {
    return {}
  }
}

async function writeGlobalRowTo(ctx: FacadeContext, config: GlobalConfigShape): Promise<void> {
  await upsertClientConfigJson(GLOBAL_CLIENT_ID, JSON.stringify(config), ctx)
}

export async function readGlobalSecret(slug: string): Promise<string> {
  const config = await readGlobalRowFrom({ global: true })
  const blob = config.secrets?.[slug]
  if (!blob) return ''
  return decrypt(blob)
}

export async function writeGlobalSecret(
  slug: string,
  plaintext: string,
  mode: 'local' | 'broadcast' = 'local',
): Promise<{ written: string[]; failed: { db: string; error: string }[] }> {
  const config = await readGlobalRowFrom({ global: true })
  const secrets = { ...(config.secrets ?? {}) }
  if (plaintext) {
    secrets[slug] = encrypt(plaintext)
  } else {
    delete secrets[slug]
  }
  const nextConfig = { ...config, secrets }

  const written: string[] = []
  const failed: { db: string; error: string }[] = []

  
  try {
    await writeGlobalRowTo({ global: true }, nextConfig)
    written.push('_local')
  } catch (err: any) {
    failed.push({ db: '_local', error: err?.message ?? 'unknown' })
  }

  
  if (mode === 'broadcast') {
    for (const clientId of getKnownTenantClientIds()) {
      try {
        
        
        const tenantConfig = await readGlobalRowFrom({ clientId })
        const tenantSecrets = { ...(tenantConfig.secrets ?? {}) }
        if (plaintext) tenantSecrets[slug] = secrets[slug]
        else delete tenantSecrets[slug]
        await writeGlobalRowTo({ clientId }, { ...tenantConfig, secrets: tenantSecrets })
        written.push(clientId)
      } catch (err: any) {
        failed.push({ db: clientId, error: err?.message?.slice(0, 200) ?? 'unknown' })
      }
    }
  }

  return { written, failed }
}

export async function hasGlobalSecret(slug: string): Promise<boolean> {
  const config = await readGlobalRowFrom({ global: true })
  return !!config.secrets?.[slug]
}
