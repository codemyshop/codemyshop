/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'

/**
 * GET /api/bo/abandoned-carts/config
 * Lit AC_CART_RECOVERY_* depuis ps_configuration.
 */
export default defineEventHandler(async (event) => {
  const db = useClientDb(event)
  const rows = await db.query<{ name: string; value: string }>(
    `SELECT name, value FROM ps_configuration
      WHERE name IN ('AC_CART_RECOVERY_AUTO','AC_CART_RECOVERY_AGE_MIN_H','AC_CART_RECOVERY_AGE_MAX_H','AC_CART_RECOVERY_VALUE_MIN','AC_CART_RECOVERY_COOLDOWN_DAYS')`,
  )
  const map = Object.fromEntries(rows.map(r => [r.name, r.value]))
  return {
    ok: true,
    auto: map.AC_CART_RECOVERY_AUTO === '1',
    ageMinH: Number(map.AC_CART_RECOVERY_AGE_MIN_H) || 24,
    ageMaxH: Number(map.AC_CART_RECOVERY_AGE_MAX_H) || 168,
    valueMin: Number(map.AC_CART_RECOVERY_VALUE_MIN) || 0,
    cooldownDays: Number(map.AC_CART_RECOVERY_COOLDOWN_DAYS) || 7,
  }
})
