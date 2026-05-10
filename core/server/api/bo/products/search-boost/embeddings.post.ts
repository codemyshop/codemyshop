/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'

/**
 * POST /api/bo/products/search-boost/embeddings
 *
 * Body: { mode: 'lex' | 'sem' | 'hybrid' }
 *
 * Persists the active mode in `ps_configuration.AC_SEARCH_MODE` (PS native,
 * key-value, multi-shop nullable). Read by /api/catalogue/search when the
 * front caller does not specify `?mode=…`.
 */

const VALID_MODES = ['lex', 'sem', 'hybrid'] as const
type SearchMode = (typeof VALID_MODES)[number]

export default defineEventHandler(async (event) => {
  const body = await readBody<{ mode?: string }>(event)
  const mode = String(body?.mode || '').toLowerCase()

  if (!VALID_MODES.includes(mode as SearchMode)) {
    throw createError({
      statusCode: 400,
      statusMessage: `mode invalide — attendu : ${VALID_MODES.join(', ')}`,
    })
  }

  const db = useClientDb(event)
  const existing = await db.get<{ id_configuration: number }>(
    `SELECT id_configuration FROM ps_configuration WHERE name = 'AC_SEARCH_MODE' LIMIT 1`,
  )

  if (existing?.id_configuration) {
    await db.query(
      `UPDATE ps_configuration SET value = ?, date_upd = NOW() WHERE id_configuration = ?`,
      [mode, existing.id_configuration],
    )
  } else {
    await db.query(
      `INSERT INTO ps_configuration (name, value, date_add, date_upd)
       VALUES ('AC_SEARCH_MODE', ?, NOW(), NOW())`,
      [mode],
    )
  }

  return { mode, ok: true }
})
