

import { useClientDb } from '~/server/utils/db'

const PUBLIC_WHITELIST = [
  'PS_B2B_ENABLE',
  'PS_CATALOG_MODE',
  'PS_GUEST_CHECKOUT_ENABLED',
] as const

type PublicFlagKey = typeof PUBLIC_WHITELIST[number]

export default defineEventHandler(async (event) => {
  try {
    const db = useClientDb(event)
    const placeholders = PUBLIC_WHITELIST.map(() => '?').join(',')
    const rows = await db.query<{ name: string; value: string }>(
      `SELECT name, value FROM ps_configuration WHERE name IN (${placeholders})`,
      PUBLIC_WHITELIST as unknown as string[],
    )

    const flags: Record<PublicFlagKey, string> = {} as Record<PublicFlagKey, string>
    for (const key of PUBLIC_WHITELIST) flags[key] = '0'
    for (const row of rows) {
      if ((PUBLIC_WHITELIST as readonly string[]).includes(row.name)) {
        flags[row.name as PublicFlagKey] = row.value
      }
    }

    
    
    setHeader(event, 'cache-control', 'public, max-age=60, stale-while-revalidate=300')

    return { flags }
  } catch (err: any) {
    console.error('[configuration/flags-public] DB error:', err.message)
    
    return { flags: Object.fromEntries(PUBLIC_WHITELIST.map(k => [k, '0'])) }
  }
})
