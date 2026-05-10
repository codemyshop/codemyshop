/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { deleteSmartProject } from '~/enterprise/base/smartproject/server/utils/smartproject'

/**
 * DELETE /api/bo/projects/:id — complete deletion of the project and
 * all its artifacts (tasks, emails, documents, auto logs, messages
 * whatsapp). See deleteSmartProject for cascade details.
 *
 * To archive without deleting: PUT /api/bo/projects/:id { is_archived: 1 }.
 */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id || id <= 0) {
    throw createError({ statusCode: 400, message: 'id projet invalide' })
  }
  try {
    const affected = await deleteSmartProject(id, { event })
    if (affected === 0) {
      throw createError({ statusCode: 404, message: 'Projet introuvable' })
    }
    return { success: true, id }
  } catch (err: any) {
    if (err.statusCode) throw err
    console.error('[bo/projects/delete] DB error:', err?.message)
    throw createError({ statusCode: 500, message: 'Erreur DB' })
  }
})
