

import { createHash } from 'node:crypto'
import { sql } from 'drizzle-orm'
import { psProxyMultipart } from '~/server/utils/ps-proxy'
import { usePocPg } from '~/server/db/drizzle-pg'
import { psFsCanWriteDownload, writeAttachmentFile } from '~/server/utils/ps-fs'

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

  
  const claimedMime = (filePart.type || '').toLowerCase()
  if (!ALLOWED_MIMES.has(claimedMime)) {
    throw createError({ statusCode: 422, message: `Type non autorisé : ${claimedMime || 'inconnu'}` })
  }

  const buffer = filePart.data
  const sha1 = createHash('sha1').update(buffer).digest('hex')
  const size = buffer.length
  const displayName = sanitizeClientName(rawName !== '' ? rawName : origName)

  const d = usePocPg()

  
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

  
  
  try {
    writeAttachmentFile(event, sha1, buffer)
  } catch (err: any) {
    throw createError({ statusCode: 500, message: `Écriture disque échouée : ${err?.message || 'unknown'}` })
  }

  
  
  const insAttachment = rows<{ id_attachment: number | string }>(await d.execute(sql`
    INSERT INTO cs_main.ps_attachment (file, file_name, file_size, mime)
    VALUES (${sha1}, ${origName}, ${size}, ${claimedMime})
    RETURNING id_attachment
  `))
  const idAttachment = Number(insAttachment[0]?.id_attachment || 0)
  if (idAttachment <= 0) {
    throw createError({ statusCode: 500, message: 'INSERT ps_attachment KO' })
  }

  
  
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

  
  await d.execute(sql`
    INSERT INTO cs_main.ps_product_attachment (id_product, id_attachment)
    VALUES (${id}, ${idAttachment})
    ON CONFLICT DO NOTHING
  `)

  
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
