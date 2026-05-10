/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { listForProduct } from '~/server/utils/attachments-db'

/**
 * GET /api/bo/products/:id/attachments?lang=X
 *
 * Lists product attachments in the requested language — Drizzle DB
 * direct (policy: "Zero PrestaShop webservice" 2026-04-22).
 */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id || id <= 0) throw createError({ statusCode: 400, message: 'id produit invalide' })

  const q = getQuery(event)
  const langId = Math.max(1, Number(q.lang) || 1)

  const list = await listForProduct(id, langId, { event })
  return {
    success: true,
    attachments: list.map((a) => ({
      id_attachment: a.idAttachment,
      file: a.file,
      file_name: a.fileName,
      file_size: a.fileSize,
      mime: a.mime,
      name: a.name,
      description: a.description,
      public_url: a.publicUrl,
    })),
    total: list.length,
  }
})
