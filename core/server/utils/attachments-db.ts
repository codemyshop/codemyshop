

import { existsSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { sql } from 'drizzle-orm'
import { usePocPg } from '../db/drizzle-pg'
import { clientIdToEnvKey, resolveTenantClientId } from './ps-tenant'

interface AttachmentsContext {
  event?: any
  clientId?: string
}

function db(_ctx: AttachmentsContext = {}) {
  return usePocPg()
}

function rows<T = any>(result: any): T[] {
  return (result as T[]) ?? []
}
function first<T = any>(result: any): T | null {
  return rows<T>(result)[0] ?? null
}

export interface AttachmentRow {
  idAttachment: number
  file: string
  fileName: string
  fileSize: number
  mime: string
  name: string
  description: string
  publicUrl: string
}

function resolvePublicShopUrl(event: any): string {
  const clientId = resolveTenantClientId(event)
  const envKey = clientIdToEnvKey(clientId)
  const frontUrl = (process.env[`PS_FRONT_URL_${envKey}`] || '').trim()
  if (frontUrl) return frontUrl.replace(/\/+$/, '')

  const apiUrl = (process.env[`PS_URL_${envKey}`] || '').trim()
  if (apiUrl) {
    try {
      const u = new URL(apiUrl)
      return `${u.protocol}//${u.host}`
    } catch {  }
  }

  try {
    const host = (event && getRequestHost(event)) || ''
    if (host) return `https://${host}`
  } catch {  }
  return ''
}

export async function listForProduct(
  idProduct: number,
  idLang: number,
  ctx: AttachmentsContext & { event?: any } = {},
): Promise<AttachmentRow[]> {
  if (idProduct <= 0 || idLang <= 0) return []
  const result = rows<any>(await db(ctx).execute(sql`
    SELECT a.id_attachment, a.file, a.file_name, a.file_size, a.mime,
           al.name, al.description
      FROM cs_main.ps_product_attachment pa
      JOIN cs_main.ps_attachment a ON a.id_attachment = pa.id_attachment
 LEFT JOIN cs_main.ps_attachment_lang al
        ON al.id_attachment = a.id_attachment AND al.id_lang = ${idLang}
     WHERE pa.id_product = ${idProduct}
     ORDER BY a.id_attachment DESC
  `))
  const baseUrl = resolvePublicShopUrl(ctx.event)
  return result.map((r): AttachmentRow => ({
    idAttachment: Number(r.id_attachment),
    file: String(r.file || ''),
    fileName: String(r.file_name || ''),
    fileSize: Number(r.file_size || 0),
    mime: String(r.mime || ''),
    name: String(r.name || ''),
    description: String(r.description || ''),
    publicUrl: `${baseUrl}/download/${encodeURIComponent(String(r.file || ''))}`,
  }))
}

export interface RenameResult {
  ok: boolean
  idAttachment?: number
  idLang?: number
  name?: string
  error?: string
  status?: number
}

export async function renameAttachment(
  idAttachment: number,
  idLang: number,
  rawName: string,
  description: string,
  ctx: AttachmentsContext = {},
): Promise<RenameResult> {
  if (idAttachment <= 0 || idLang <= 0) {
    return { ok: false, status: 422, error: 'id_attachment et id_lang requis' }
  }
  const name = rawName.replace(/\s+/g, ' ').trim().slice(0, 32)
  if (!name) return { ok: false, status: 422, error: 'name requis' }

  const d = db(ctx)
  const exists = await d.execute(sql`
    SELECT id_attachment FROM cs_main.ps_attachment WHERE id_attachment = ${idAttachment} LIMIT 1
  `).then(first<{ id_attachment: number }>)
  if (!exists) return { ok: false, status: 404, error: 'Attachment introuvable' }

  await d.execute(sql`
    INSERT INTO cs_main.ps_attachment_lang (id_attachment, id_lang, name, description)
    VALUES (${idAttachment}, ${idLang}, ${name}, ${description})
    ON CONFLICT (id_attachment, id_lang) DO UPDATE
       SET name = EXCLUDED.name, description = EXCLUDED.description
  `)
  return { ok: true, idAttachment, idLang, name }
}

export interface DeleteAttachmentResult {
  ok: boolean
  unlinked: boolean
  orphanPurged: boolean
  physicalRemoved: boolean
  remainingOnProduct: number
  error?: string
  status?: number
}

function attemptUnlinkOrphan(event: any, sha1: string): boolean {
  if (!sha1) return false
  const clientId = resolveTenantClientId(event)
  const envKey = clientIdToEnvKey(clientId)
  const dir = (process.env[`PS_DOWNLOAD_DIR_${envKey}`] || '').trim()
  if (!dir) return false
  try {
    const path = join(dir, sha1)
    if (existsSync(path)) {
      unlinkSync(path)
      return true
    }
  } catch (err: any) {
    console.warn(`[attachments-db] unlink ${sha1} failed:`, err?.message || err)
  }
  return false
}

export async function deleteAttachment(
  idProduct: number,
  idAttachment: number,
  ctx: AttachmentsContext & { event?: any } = {},
): Promise<DeleteAttachmentResult> {
  if (idProduct <= 0 || idAttachment <= 0) {
    return {
      ok: false, unlinked: false, orphanPurged: false, physicalRemoved: false,
      remainingOnProduct: 0, status: 422, error: 'id_product et id_attachment requis',
    }
  }
  const d = db(ctx)

  await d.execute(sql`
    DELETE FROM cs_main.ps_product_attachment
     WHERE id_product = ${idProduct} AND id_attachment = ${idAttachment}
  `)

  const linkedRow = await d.execute(sql`
    SELECT COUNT(*) AS n FROM cs_main.ps_product_attachment WHERE id_attachment = ${idAttachment}
  `).then(first<{ n: number | string }>)
  const nbLinked = Number(linkedRow?.n || 0)

  let physicalRemoved = false
  if (nbLinked === 0) {
    const sha1Row = await d.execute(sql`
      SELECT file FROM cs_main.ps_attachment WHERE id_attachment = ${idAttachment} LIMIT 1
    `).then(first<{ file: string }>)
    const sha1 = String(sha1Row?.file || '')

    await d.execute(sql`DELETE FROM cs_main.ps_attachment_lang WHERE id_attachment = ${idAttachment}`)
    await d.execute(sql`DELETE FROM cs_main.ps_attachment      WHERE id_attachment = ${idAttachment}`)

    physicalRemoved = attemptUnlinkOrphan(ctx.event, sha1)
  }

  const remainingRow = await d.execute(sql`
    SELECT COUNT(*) AS n FROM cs_main.ps_product_attachment WHERE id_product = ${idProduct}
  `).then(first<{ n: number | string }>)
  const remainingOnProduct = Number(remainingRow?.n || 0)

  if (remainingOnProduct === 0) {
    await d.execute(sql`UPDATE cs_main.ps_product SET cache_has_attachments = 0 WHERE id_product = ${idProduct}`)
  }

  return {
    ok: true,
    unlinked: true,
    orphanPurged: nbLinked === 0,
    physicalRemoved,
    remainingOnProduct,
  }
}
