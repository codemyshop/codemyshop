/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /api/checkout/bankwire-details
 *
 * Bank account information for the tenant for wire transfer payment.
 * Source: ps_configuration (native keys of the ps_wirepayment module).
 *
 * Response: { owner, details, address } — strings ready to display.
 * If not configured (all empty) → returns the 3 fields as empty string,
 * the UI then displays the fallback "your information will be sent to you".
 */
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
