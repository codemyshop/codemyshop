

import { useClientDb } from '~/server/utils/db'

interface AttachmentRow {
  file: string
  file_name: string
  mime: string
}

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id || isNaN(id)) throw createError({ statusCode: 400, message: 'ID invalide' })

  const db = useClientDb(event)
  const rows = await db.query<AttachmentRow>(
    'SELECT file, file_name, mime FROM ps_attachment WHERE id_attachment = ? LIMIT 1',
    [id],
  )
  const meta = rows?.[0]
  if (!meta?.file) throw createError({ statusCode: 404, message: 'Fiche technique introuvable' })

  
  
  
  const fname = encodeURIComponent(meta.file_name || `attachment-${id}.pdf`)
  return sendRedirect(event, `/dl/${meta.file}?name=${fname}`, 302)
})
