/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { listActiveSmartProjects } from '~/enterprise/base/smartproject/server/utils/smartproject'

/**
 * GET /api/bo/projects — CRM projects (SmartProject) from the local database.
 *
 * DB-First : lecture directe cs_smartproject + JOIN cs_smartlead via
 * the ac_smartproject facade for the contact name.
 */
export default defineEventHandler(async (event) => {
  try {
    const projects = await listActiveSmartProjects({ event })
    return { projects }
  } catch (err: any) {
    if (err?.code === 'ER_NO_SUCH_TABLE' || err?.errno === 1146) {
      return { projects: [] }
    }
    console.error('[bo/projects] DB error:', err?.message)
    return { projects: [] }
  }
})
