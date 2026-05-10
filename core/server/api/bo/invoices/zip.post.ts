/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import archiver from 'archiver'
import { PassThrough } from 'stream'

/**
 * POST /api/bo/invoices/zip — downloads multiple invoices as a ZIP.
 * Body: { ids: [1, 2, 3] }
 * Generates each PDF via the internal endpoint /api/bo/invoices/pdf?id=X
 */
export default defineEventHandler(async (event) => {
  const { ids } = await readBody<{ ids: number[] }>(event)
  if (!ids?.length) throw createError({ statusCode: 400, message: 'IDs required' })

  setResponseHeaders(event, {
    'Content-Type': 'application/zip',
    'Content-Disposition': `attachment; filename="factures-${ids.length}.zip"`,
  })

  const archive = archiver('zip', { zlib: { level: 5 } })
  const passthrough = new PassThrough()
  archive.pipe(passthrough)

  const baseUrl = getRequestURL(event)
  const origin = `${baseUrl.protocol}//${baseUrl.host}`
  const cookies = getRequestHeader(event, 'cookie') || ''

  for (const id of ids) {
    try {
      const pdfBuffer = await $fetch<ArrayBuffer>(`${origin}/api/bo/invoices/pdf?id=${id}`, {
        headers: { cookie: cookies },
        responseType: 'arrayBuffer',
      })
      archive.append(Buffer.from(pdfBuffer), { name: `facture-${id}.pdf` })
    } catch (err: any) {
      console.warn(`[invoices/zip] Skip invoice ${id}:`, err?.message)
    }
  }

  archive.finalize()
  return sendStream(event, passthrough)
})
