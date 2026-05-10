/**
 *
 * Helper server to read the business profile of the current tenant from
 * ps_configuration (no HTTP round-trip). To be used in
 * endpoints that adapt their response based on vertical/channel.
 */

import { useClientDb } from '~/server/utils/db'

export type BusinessVertical = 'food' | 'beauty' | 'vape' | 'fashion' | 'services' | 'electronics' | 'generic'
export type BusinessChannel = 'pure-online' | 'phygital' | 'b2b-only' | 'marketplace' | 'mix'

export interface TenantProfile {
  vertical: BusinessVertical
  channel: BusinessChannel
}

const DEFAULT: TenantProfile = { vertical: 'generic', channel: 'pure-online' }

export async function getTenantProfile(event: any): Promise<TenantProfile> {
  try {
    const db = useClientDb(event)
    const rows = await db.query<{ name: string; value: string | null }>(
      `SELECT name, value FROM ps_configuration WHERE name IN (?, ?)`,
      ['PS_AC_TENANT_VERTICAL', 'PS_AC_TENANT_CHANNEL'],
    )
    const map = new Map<string, string>()
    for (const r of rows) map.set(r.name, r.value ?? '')
    return {
      vertical: (map.get('PS_AC_TENANT_VERTICAL') as BusinessVertical) || DEFAULT.vertical,
      channel: (map.get('PS_AC_TENANT_CHANNEL') as BusinessChannel) || DEFAULT.channel,
    }
  } catch {
    return { ...DEFAULT }
  }
}
