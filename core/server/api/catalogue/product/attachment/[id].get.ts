/**
 *
 * GET /api/catalogue/product/attachment/:id?clientId=example-shop-v2
 *
 * Serves the binary of a PrestaShop attachment (product datasheet PDF/Excel) via redirect
 * to /dl/<hash> of the tenant's nginx.
 *
 * Doctrine DB-Only (2026-04-22) — drop of legacy PrestaShop proxy: we read the hash
 * from DB (ps_attachment.file) then we redirect to /dl/<hash> served by the
 * tenant's nginx static_img. The browser downloads directly from
 * nginx (Content-Disposition: attachment enforced on the nginx side), no double
 * buffering on the Nuxt side.
 *
 * Prerequisites: the nginx tenant has a /dl/ location that serves the filesystem.
 * ($tenant/usr/share/nginx/html/dl/<hash>).
 */
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

  // Redirect vers /dl/<hash> (même origine que la requête → pas de CORS)
  // Le file_name est encodé en query pour permettre au navigateur de
  // suggérer le bon nom de fichier au téléchargement.
  const fname = encodeURIComponent(meta.file_name || `attachment-${id}.pdf`)
  return sendRedirect(event, `/dl/${meta.file}?name=${fname}`, 302)
})
