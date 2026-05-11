

import { useClientDb } from '~/server/utils/db'

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
