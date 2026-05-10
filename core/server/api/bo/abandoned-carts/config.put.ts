/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'
import { upsertConfiguration } from '~/server/utils/ps-configuration'

/**
 * PUT /api/bo/abandoned-carts/config
 * Body : { auto?: bool, ageMinH?: int, ageMaxH?: int, valueMin?: int, cooldownDays?: int }
 *
 * UPSERT on ps_configuration. The Python cron reads AC_CART_RECOVERY_AUTO=1
 * to enable automatic sending.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<{
    auto?: boolean
    ageMinH?: number
    ageMaxH?: number
    valueMin?: number
    cooldownDays?: number
  }>(event)

  const db = useClientDb(event)
  const updates: Array<[string, string]> = []
  if (body?.auto !== undefined) updates.push(['AC_CART_RECOVERY_AUTO', body.auto ? '1' : '0'])
  if (body?.ageMinH !== undefined) updates.push(['AC_CART_RECOVERY_AGE_MIN_H', String(Math.max(1, Number(body.ageMinH)))])
  if (body?.ageMaxH !== undefined) updates.push(['AC_CART_RECOVERY_AGE_MAX_H', String(Math.max(1, Number(body.ageMaxH)))])
  if (body?.valueMin !== undefined) updates.push(['AC_CART_RECOVERY_VALUE_MIN', String(Math.max(0, Number(body.valueMin)))])
  if (body?.cooldownDays !== undefined) updates.push(['AC_CART_RECOVERY_COOLDOWN_DAYS', String(Math.max(1, Number(body.cooldownDays)))])

  for (const [name, value] of updates) {
    await upsertConfiguration(db, name, value)
  }

  return { ok: true, updated: updates.length }
})
