

import { useClientDb, useClientDbById } from '~/server/utils/db'

const KEYS = ['BANK_WIRE_OWNER', 'BANK_WIRE_DETAILS', 'BANK_WIRE_ADDRESS', 'BANK_WIRE_CUSTOM_TEXT'] as const

export default defineEventHandler(async (event) => {
  const { clientId } = getQuery(event) as { clientId?: string }
  const db = clientId ? useClientDbById(String(clientId)) : useClientDb(event)

  const rows = await db.query<{ name: string; value: string | null }>(
    `SELECT name, value FROM ps_configuration WHERE name IN (?, ?, ?, ?)`,
    KEYS as unknown as string[],
  ).catch(() => [])

  const map: Record<string, string> = {}
  for (const r of rows) map[r.name] = String(r.value || '')

  return {
    owner:      map.BANK_WIRE_OWNER || '',
    details:    map.BANK_WIRE_DETAILS || '',
    address:    map.BANK_WIRE_ADDRESS || '',
    customText: map.BANK_WIRE_CUSTOM_TEXT || '',
  }
})
