/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * POST /api/bo/team/extra/:id/upload-photo
 *
 * Upload of an employee's profile photo (author page, team page,
 * blog articles, /rdv). Encode the source image in AVIF **and** WebP via
 * sharp then keep the format with the smallest file size. The row
 * `cs_employee_extra` is created if it doesn't exist (slug auto derived
 * from the name), otherwise only the `photo_url` column is updated — the
 * autres champs (bio, expertise, slug existant, etc.) restent intacts.
 *
 * Body : multipart/form-data { file: File }
 * Retour : { success, url, format: 'avif' | 'webp', sizeKb, filename }
 */

import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { requireEmployeeSession } from '~/server/utils/session'
import {
  getEmployeeBaseInfo,
  setEmployeePhotoUrl,
} from '~/internal/employeeextra/server/utils/employeeextra'

const MAX_FILE_SIZE = 8 * 1024 * 1024 // 8 Mo source
const TARGET_SIZE = 800              // côté max (carré crop intelligent)
const WEBP_QUALITY = 82
const AVIF_QUALITY = 60               // AVIF q60 ≈ WebP q82 visuellement

function slugifyName(firstname: string | null, lastname: string | null, id: number): string {
  const raw = `${firstname || ''}-${lastname || ''}`
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 128)
  return raw || `employe-${id}`
}

export default defineEventHandler(async (event) => {
  requireEmployeeSession(event)

  const id = Number(getRouterParam(event, 'id'))
  if (!id || id < 1) {
    throw createError({ statusCode: 400, message: 'id invalide' })
  }

  const emp = await getEmployeeBaseInfo(id, { event })
  if (!emp) {
    throw createError({ statusCode: 404, message: 'Employé introuvable' })
  }

  // ── Parse multipart ────────────────────────────────────────────────────
  const parts = await readMultipartFormData(event)
  const filePart = parts?.find(p => p.name === 'file')
  if (!filePart?.data || !filePart.filename) {
    throw createError({ statusCode: 400, message: 'Champ "file" manquant' })
  }

  const mime = filePart.type ?? ''
  if (!mime.startsWith('image/')) {
    throw createError({ statusCode: 400, message: `Type non supporté : ${mime}` })
  }
  if (filePart.data.length > MAX_FILE_SIZE) {
    throw createError({ statusCode: 400, message: 'Fichier trop volumineux (max 8 Mo)' })
  }

  // ── Encodage AVIF + WebP en parallèle, on garde le plus petit ──────────
  const sharp = (await import('sharp')).default
  const base = sharp(filePart.data)
    .rotate()
    .resize({
      width: TARGET_SIZE,
      height: TARGET_SIZE,
      fit: 'cover',
      position: 'attention',
    })

  const [webpBuf, avifBuf] = await Promise.all([
    base.clone().webp({ quality: WEBP_QUALITY, effort: 4 }).toBuffer(),
    base.clone().avif({ quality: AVIF_QUALITY, effort: 4 }).toBuffer(),
  ])

  const useAvif = avifBuf.length < webpBuf.length
  const outBuf = useAvif ? avifBuf : webpBuf
  const ext = useAvif ? 'avif' : 'webp'

  // ── Écriture sur disque (Nginx /static/uploads/team-photos/…) ──────────
  const runtime = useRuntimeConfig(event)
  const envDir = runtime.uploadStaticDir as string
  const uploadsBase = envDir
    ? join(envDir, 'uploads')
    : join(process.cwd(), 'public', 'static', 'uploads')

  const outDir = join(uploadsBase, 'team-photos')
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })

  const uid = randomUUID().slice(0, 12)
  const filename = `employee_${id}_${uid}.${ext}`
  const outPath = join(outDir, filename)

  const { writeFileSync } = await import('node:fs')
  writeFileSync(outPath, outBuf)

  const url = `/static/uploads/team-photos/${filename}`

  // ── Persistance DB (UPSERT photo_url uniquement) ───────────────────────
  const fallbackSlug = slugifyName(emp.firstname, emp.lastname, id)
  try {
    await setEmployeePhotoUrl(id, url, fallbackSlug, { event })
  } catch (err: any) {
    if (String(err?.message || '').includes("doesn't exist")
        || String(err?.message || '').includes('does not exist')) {
      throw createError({
        statusCode: 503,
        message: 'Table cs_employee_extra absente — module ac_employeeextra requis sur ce tenant.',
      })
    }
    throw err
  }

  return {
    success: true,
    url,
    format: ext,
    sizeKb: Math.round(outBuf.length / 1024),
    filename,
  }
})
