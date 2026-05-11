

import { useClientDb } from '~/server/utils/db'

const KEYS = ['PS_AC_TENANT_VERTICAL', 'PS_AC_TENANT_CHANNEL'] as const

export default defineEventHandler(async (event) => {
  const db = useClientDb(event)
  const rows = await db.query<{ name: string; value: string | null }>(
    `SELECT name, value FROM ps_configuration WHERE name IN (?, ?)`,
    KEYS as unknown as string[],
  ).catch(() => [])

  const map = new Map<string, string>()
  for (const r of rows) map.set(r.name, r.value ?? '')

  return {
    vertical: map.get('PS_AC_TENANT_VERTICAL') || 'generic',
    channel: map.get('PS_AC_TENANT_CHANNEL') || 'pure-online',
  }
})
