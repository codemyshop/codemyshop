

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { sql } from 'drizzle-orm'
import { psProxy } from '~/server/utils/ps-proxy'
import { requireRoleOrSaas } from '~/server/utils/session'
import { usePocPg } from '~/server/db/drizzle-pg'
import {
  listLegacyCategoryJpgs,
  psFsCanWriteImgCategory,
  purgeCategoryImagesForId,
  resolvePsImgCategoryDir,
  writeCategoryImage,
} from '~/server/utils/ps-fs'

const COVER_WIDTHS = [400, 600, 800, 1200] as const
const JPG_FALLBACK_WIDTH = 800

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

interface MigrationResult {
  success: boolean
  dry_run: boolean
  force: boolean
  limit: number
  scanned: number
  migrated: Array<{ id: number; slug: string; files: string[] }>
  skipped: Array<{ id: number; reason: string }>
  errors: Array<{ id: number; reason: string }>
}

export default defineEventHandler(async (event) => {
  requireRoleOrSaas(event, ['root', 'founder', 'market'])

  const q = getQuery(event)
  const force = q.force === '1' || q.force === 'true'
  const dryRun = q.dry_run === '1' || q.dry_run === 'true'
  const limit = Math.max(0, Number(q.limit) || 0)

  
  if (!psFsCanWriteImgCategory(event)) {
    const forwarded: Record<string, string> = {}
    if (force) forwarded.force = '1'
    if (dryRun) forwarded.dry_run = '1'
    if (limit > 0) forwarded.limit = String(limit)

    const result = await psProxy<MigrationResult>({
      module: 'ac_categorycovergen',
      controller: 'migrate',
      method: 'POST',
      query: forwarded,
    }, event)

    if (!result?.success) {
      throw createError({ statusCode: 502, message: (result as any)?.error || 'Migration PS refusée' })
    }
    return result
  }

  
  const dir = resolvePsImgCategoryDir(event)
  if (!dir || !existsSync(dir)) {
    throw createError({ statusCode: 500, message: 'Dossier /img/c introuvable côté Nuxt' })
  }

  const candidates = listLegacyCategoryJpgs(event)
    .map(c => c.idCategory)
    .sort((a, b) => a - b)

  if (candidates.length === 0) {
    return { success: true, dry_run: dryRun, force, limit, scanned: 0, migrated: [], skipped: [], errors: [] } as MigrationResult
  }

  const d = usePocPg()
  const slugRows = rows<{ id_category: number | string; link_rewrite: string }>(await d.execute(sql`
    SELECT cl.id_category, cl.link_rewrite
      FROM cs_main.ps_category_lang cl
      JOIN cs_main.ps_category c ON c.id_category = cl.id_category
     WHERE cl.id_lang = 1 AND cl.id_shop = 1
       AND cl.id_category IN (${sql.join(candidates.map(id => sql`${id}`), sql`, `)})
  `))
  const slugs = new Map<number, string>()
  for (const r of slugRows) {
    slugs.set(Number(r.id_category), slugify(String(r.link_rewrite || '')))
  }

  const migrated: Array<{ id: number; slug: string; files: string[] }> = []
  const skipped: Array<{ id: number; reason: string }> = []
  const errors: Array<{ id: number; reason: string }> = []

  const sharp = (await import('sharp')).default
  
  const dirFiles = readdirSync(dir)
  const webpByCat = new Map<number, number>()
  for (const name of dirFiles) {
    if (!name.endsWith('.webp') || name.endsWith('-thumb.webp')) continue
    const m = /^(\d+)-/.exec(name)
    if (!m) continue
    const k = Number(m[1])
    webpByCat.set(k, (webpByCat.get(k) || 0) + 1)
  }

  for (const idCat of candidates) {
    if (limit > 0 && migrated.length >= limit) break

    const slug = slugs.get(idCat)
    if (!slug) {
      skipped.push({ id: idCat, reason: 'catégorie inactive ou introuvable' })
      continue
    }

    if (!force) {
      const existingCount = webpByCat.get(idCat) || 0
      if (existingCount > 0) {
        skipped.push({ id: idCat, reason: `webp déjà présent (${existingCount} variantes)` })
        continue
      }
    }

    if (dryRun) {
      migrated.push({
        id: idCat,
        slug,
        files: [...COVER_WIDTHS.map(w => `${idCat}-${slug}-${w}.webp`), `${idCat}.jpg`],
      })
      continue
    }

    try {
      const srcBuffer = readFileSync(`${dir.replace(/\/+$/, '')}/${idCat}.jpg`)
      const base = sharp(srcBuffer).rotate()

      
      purgeCategoryImagesForId(event, idCat, 'cover')

      const written: string[] = []
      for (const w of COVER_WIDTHS) {
        const buf = await base
          .clone()
          .resize({ width: w, height: w, fit: 'cover', position: 'center', withoutEnlargement: false })
          .webp({ quality: 82, effort: 5 })
          .toBuffer()
        const filename = `${idCat}-${slug}-${w}.webp`
        writeCategoryImage(event, filename, buf)
        written.push(filename)
      }

      const jpgBuf = await base
        .clone()
        .resize({ width: JPG_FALLBACK_WIDTH, height: JPG_FALLBACK_WIDTH, fit: 'cover', position: 'center', withoutEnlargement: false })
        .jpeg({ quality: 85, progressive: true })
        .toBuffer()
      writeCategoryImage(event, `${idCat}.jpg`, jpgBuf)
      written.push(`${idCat}.jpg`)

      migrated.push({ id: idCat, slug, files: written })
    } catch (err: any) {
      errors.push({ id: idCat, reason: err?.message || 'sharp/write erreur' })
    }
  }

  return {
    success: true,
    dry_run: dryRun,
    force,
    limit,
    scanned: candidates.length,
    migrated,
    skipped,
    errors,
  } as MigrationResult
})
