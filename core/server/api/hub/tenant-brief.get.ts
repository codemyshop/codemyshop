/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /api/hub/tenant-brief
 *
 * Returns the audience brief for the tenant injected in all AI prompts in the hub
 * (categories, products, blog…). Source: ps_configuration.PS_AC_TENANT_AUDIENCE.
 *
 * The brief is edited in /hub/informations Preferences tab. It serves to
 * guide the tone, target audience, and B2C/B2B exclusions in prompts —
 * an exclusive B2B site should not generate content
 * designed for consumers.
 */

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
