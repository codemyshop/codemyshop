/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /api/hub/configuration/business-profile
 *
 * Tenant business profile — 2 orthogonal axes:
 * - PS_AC_TENANT_VERTICAL: industry vertical (food, beauty, vape, fashion,
 * services, electronics, generic). Drives PIM/MDM behaviors
 * specific to the domain (lots+DLC, variable weight, unit price HT/K
 * or HT/U on food, etc).
 * - PS_AC_TENANT_CHANNEL: distribution model (pure-online, phygital,
 * b2b-only, marketplace, mix). Drives omnichannel behaviors
 * (multi-warehouse, click-and-collect, store selector).
 *
 * Storage: ps_configuration (native PS pattern, no additional schema).
 */

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
