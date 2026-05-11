

import { sql } from 'drizzle-orm'
import { requireRoleOrSaas } from '~/server/utils/session'
import { usePocPg } from '~/server/db/drizzle-pg'
import {
  psFsCanWriteImgCategory,
  purgeCategoryImagesForId,
  writeCategoryImage,
} from '~/server/utils/ps-fs'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const COVER_WIDTHS = [400, 600, 800, 1200] as const
const COVER_LEGACY_JPG_WIDTH = 800
const THUMB_WIDTH = 200

function slugify(s: string): string {
  const base = (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  return base || 'category'
}

function rows<T = any>(result: any): T[] {
  
  return ((result as any) as T[]) ?? []
}

interface ImagePart {
  name: string
  filename: string
  contentType: string
  data: Buffer
}

export default defineEventHandler(async (event) => {
  requireRoleOrSaas(event, ['root', 'founder', 'market'])

  const id = Number(getRouterParam(event, 'id'))
  if (!id || id <= 0) {
    throw createError({ statusCode: 400, message: 'id catégorie invalide' })
  }

  const q = getQuery(event)
  const variant = String(q.variant || 'cover')
  if (variant !== 'cover' && variant !== 'thumb') {
    throw createError({ statusCode: 422, message: 'variant doit être cover ou thumb' })
  }

  const d = usePocPg()
  const slugRows = rows<{ link_rewrite: string }>(await d.execute(sql`
    SELECT link_rewrite FROM cs_main.ps_category_lang
     WHERE id_category = ${id} AND id_lang = 1 AND id_shop = 1 LIMIT 1
  `))
  const slug = slugify(slugRows[0]?.link_rewrite || `cat-${id}`)

  const form = await readMultipartFormData(event)
  const filePart = form?.find(p => p.name === 'file')
  if (!filePart?.data) {
    throw createError({ statusCode: 422, message: 'file requis' })
  }
  if (!(filePart.type ?? '').startsWith('image/')) {
    throw createError({ statusCode: 422, message: `Type non supporté : ${filePart.type}` })
  }
  if (filePart.data.length > MAX_FILE_SIZE) {
    throw createError({ statusCode: 413, message: 'Fichier trop lourd (max 10 Mo)' })
  }

  const sharp = (await import('sharp')).default
  const base = sharp(filePart.data).rotate()

  const parts: ImagePart[] = []
  const written: string[] = []

  if (variant === 'cover') {
    for (const width of COVER_WIDTHS) {
      const buf = await base
        .clone()
        .resize({ width, height: width, fit: 'cover', position: 'center', withoutEnlargement: false })
        .webp({ quality: 82, effort: 5 })
        .toBuffer()
      const filename = `${id}-${slug}-${width}.webp`
      parts.push({ name: `image_${width}`, filename, contentType: 'image/webp', data: buf })
      written.push(filename)
    }
    const jpg = await base
      .clone()
      .resize({ width: COVER_LEGACY_JPG_WIDTH, height: COVER_LEGACY_JPG_WIDTH, fit: 'cover', position: 'center', withoutEnlargement: false })
      .jpeg({ quality: 85, progressive: true })
      .toBuffer()
    parts.push({ name: 'image_jpg', filename: `${id}.jpg`, contentType: 'image/jpeg', data: jpg })
    written.push(`${id}.jpg`)
  } else {
    const webpBuf = await base
      .clone()
      .resize({ width: THUMB_WIDTH, height: THUMB_WIDTH, fit: 'cover', position: 'center' })
      .webp({ quality: 82, effort: 5 })
      .toBuffer()
    const webpName = `${id}-${slug}-thumb.webp`
    parts.push({ name: 'image_thumb_webp', filename: webpName, contentType: 'image/webp', data: webpBuf })
    written.push(webpName)

    const jpgBuf = await base
      .clone()
      .resize({ width: THUMB_WIDTH, height: THUMB_WIDTH, fit: 'cover', position: 'center' })
      .jpeg({ quality: 85 })
      .toBuffer()
    parts.push({ name: 'image_thumb_jpg', filename: `${id}_thumb.jpg`, contentType: 'image/jpeg', data: jpgBuf })
    written.push(`${id}_thumb.jpg`)
  }

  if (!psFsCanWriteImgCategory(event)) {
    throw createError({
      statusCode: 501,
      message: 'Upload cover indisponible — env PS_IMG_CATEGORY_DIR_<TENANT> non configuré côté Nuxt host (mount du volume /img/c/ requis).',
    })
  }

  const purged = purgeCategoryImagesForId(event, id, variant)
  for (const p of parts) {
    try {
      writeCategoryImage(event, p.filename, p.data)
    } catch (err: any) {
      throw createError({ statusCode: 500, message: `Écriture disque échouée (${p.filename}) : ${err?.message || 'unknown'}` })
    }
  }
  try {
    await d.execute(sql`UPDATE cs_main.ps_category SET date_upd = NOW() WHERE id_category = ${id}`)
  } catch {  }
  return { success: true, variant, slug, files: written, purged }
})
