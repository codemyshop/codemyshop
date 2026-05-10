/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { createHash } from 'node:crypto'
import { sql } from 'drizzle-orm'
import { psProxyMultipart } from '~/server/utils/ps-proxy'
import { usePocPg } from '~/server/db/drizzle-pg'
import { psFsCanWriteDownload, writeAttachmentFile } from '~/server/utils/ps-fs'

/**
 * POST /api/bo/products/:id/attachments?lang=X
 *
 * Phase 9b.3 — file system decoupling Nuxt↔PS. If the PS download volume is mounted
 * on the Nuxt side (env `PS_DOWNLOAD_DIR_<KEY>`), DB-direct pipeline:
 *   1. validate (taille + MIME whitelist)
 * 2. sha1 of buffer + write fs `/download/<sha1>` (perms 0644)
 *   3. INSERT ps_attachment
 * 4. INSERT IGNORE ps_attachment_lang × N (all active languages)
 *   5. INSERT IGNORE ps_product_attachment
 *   6. UPDATE ps_product.cache_has_attachments = 1 (incidents — sinon FT
 * invisible on the frontend).
 *
 * Otherwise (env var absent): fallback to psProxyMultipart for attachment uploads
 * while the tenant lacks a cross-container mount.
 */

const MAX_FILE_SIZE = 20 * 1024 * 1024
const ALLOWED_MIMES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/zip',
])

function sanitizeClientName(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().slice(0, 32)
}

function rows<T = any>(result: any): T[] {
  // postgres-js : `d.execute(sql\`…\`)` retourne directement un array de rows.
  return ((result as any) as T[]) ?? []
}

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id || id <= 0) throw createError({ statusCode: 400, message: 'id produit invalide' })

  const q = getQuery(event)
  const langId = Math.max(1, Number(q.lang) || 1)

  const form = await readMultipartFormData(event)
  if (!form || !form.length) {
    throw createError({ statusCode: 400, message: 'Body multipart vide' })
  }

  const filePart = form.find((p) => p.name === 'file')
  if (!filePart || !filePart.data) {
    throw createError({ statusCode: 422, message: 'file requis' })
  }
  if (filePart.data.length > MAX_FILE_SIZE) {
    throw createError({ statusCode: 413, message: 'Fichier trop lourd (max 20 Mo)' })
  }

  const getField = (name: string): string => {
    const p = form.find((x) => x.name === name)
    if (!p || !p.data) return ''
    return p.data.toString('utf8')
  }

  const rawName = getField('name')
  const description = getField('description')
  const origName = filePart.filename || 'upload'

  // ── Fallback legacy : pas de mount FS pour ce tenant → psProxyMultipart ─
  if (!psFsCanWriteDownload(event)) {
    try {
      const result = await psProxyMultipart<{
        success: boolean
        error?: string
        id_attachment?: number
        file?: string
        mime?: string
        file_size?: number
        name?: string
      }>({
        module: 'ac_attachmentapi',
        controller: 'upload',
        parts: [
          { name: 'id_product', data: String(id) },
          { name: 'id_lang', data: String(langId) },
          { name: 'name', data: rawName },
          { name: 'description', data: description },
          {
            name: 'file',
            filename: origName,
            contentType: filePart.type || 'application/octet-stream',
            data: filePart.data,
          },
        ],
      }, event)
      if (!result?.success) {
        throw createError({ statusCode: 422, message: result?.error || 'Upload PS refusé' })
      }
      return result
    } catch (err: any) {
      if (err?.statusCode) throw err
      throw createError({ statusCode: 502, message: err?.message || 'PS proxy erreur' })
    }
  }

  // ── Pipeline DB-direct ────────────────────────────────────────────────
  const claimedMime = (filePart.type || '').toLowerCase()
  if (!ALLOWED_MIMES.has(claimedMime)) {
    throw createError({ statusCode: 422, message: `Type non autorisé : ${claimedMime || 'inconnu'}` })
  }

  const buffer = filePart.data
  const sha1 = createHash('sha1').update(buffer).digest('hex')
  const size = buffer.length
  const displayName = sanitizeClientName(rawName !== '' ? rawName : origName)

  const d = usePocPg()

  // Vérif produit + langue (cohérent avec controller PHP).
  const productCheck = rows<{ id_product: number }>(await d.execute(sql`
    SELECT id_product FROM cs_main.ps_product WHERE id_product = ${id} LIMIT 1
  `))
  if (!productCheck.length) {
    throw createError({ statusCode: 404, message: 'Produit introuvable' })
  }
  const langCheck = rows<{ id_lang: number }>(await d.execute(sql`
    SELECT id_lang FROM cs_main.ps_lang WHERE id_lang = ${langId} AND active = 1 LIMIT 1
  `))
  if (!langCheck.length) {
    throw createError({ statusCode: 422, message: 'Langue inactive' })
  }

  // Write FS (idempotent : si un fichier existe déjà avec ce sha1, on l'écrase
  // avec le même contenu — pas de risque, le sha1 est le hash du buffer).
  try {
    writeAttachmentFile(event, sha1, buffer)
  } catch (err: any) {
    throw createError({ statusCode: 500, message: `Écriture disque échouée : ${err?.message || 'unknown'}` })
  }

  // 1. INSERT ps_attachment (nouveau row à chaque upload — pivot porte l'unicité).
  //    PG : RETURNING id_attachment (≠ MySQL LAST_INSERT_ID).
  const insAttachment = rows<{ id_attachment: number | string }>(await d.execute(sql`
    INSERT INTO cs_main.ps_attachment (file, file_name, file_size, mime)
    VALUES (${sha1}, ${origName}, ${size}, ${claimedMime})
    RETURNING id_attachment
  `))
  const idAttachment = Number(insAttachment[0]?.id_attachment || 0)
  if (idAttachment <= 0) {
    throw createError({ statusCode: 500, message: 'INSERT ps_attachment KO' })
  }

  // 2. INSERT … ON CONFLICT DO NOTHING ps_attachment_lang × toutes langues actives.
  //    PG natif (≠ MySQL INSERT IGNORE).
  const activeLangs = rows<{ id_lang: number | string }>(await d.execute(sql`
    SELECT id_lang FROM cs_main.ps_lang WHERE active = 1
  `))
  for (const r of activeLangs) {
    const lid = Number(r.id_lang)
    if (lid <= 0) continue
    await d.execute(sql`
      INSERT INTO cs_main.ps_attachment_lang (id_attachment, id_lang, name, description)
      VALUES (${idAttachment}, ${lid}, ${displayName}, ${description})
      ON CONFLICT DO NOTHING
    `)
  }

  // 3. INSERT … ON CONFLICT DO NOTHING ps_product_attachment (pivot idempotent).
  await d.execute(sql`
    INSERT INTO cs_main.ps_product_attachment (id_product, id_attachment)
    VALUES (${id}, ${idAttachment})
    ON CONFLICT DO NOTHING
  `)

  // 4. cache_has_attachments = 1.
  await d.execute(sql`
    UPDATE cs_main.ps_product SET cache_has_attachments = 1 WHERE id_product = ${id}
  `)

  return {
    success: true,
    id_attachment: idAttachment,
    file: sha1,
    mime: claimedMime,
    file_size: size,
    file_name: origName,
    name: displayName,
    id_lang: langId,
  }
})
