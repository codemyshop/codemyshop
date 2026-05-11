

import { useClientDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  try {
    const db = useClientDb(event)
    const rows = await db.query<{ value: string | null }>(
      `SELECT value FROM ps_configuration WHERE name = ? LIMIT 1`,
      ['PS_AC_TENANT_AUDIENCE'],
    )
    const audience = rows[0]?.value?.trim() ?? ''
    return { audience }
  } catch (err: any) {
    console.error('[hub/tenant-brief] DB error:', err.message)
    throw createError({ statusCode: 500, message: 'DB error: ' + err.message })
  }
})
