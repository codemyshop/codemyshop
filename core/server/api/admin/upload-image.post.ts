/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * POST /api/admin/upload-image
 *
 * Image upload with automatic WebP conversion (via sharp).
 * Auth : cookie hub_session (owner/developer).
 *
 * Body : multipart/form-data { file: File, dest?: string }
 *   - file : image source (PNG, JPG, SVG, WebP)
 * - dest: destination subfolder (e.g., "logos", "hero"). Default: "uploads"
 *
 * Retourne : { success: true, url: "/static/uploads/logos/xxx.webp", filename: "xxx.webp" }
 *
 * Stockage :
 *   - En local (dev/preprod) : core/public/uploads/{dest}/
 * - On VPS: UPLOAD_STATIC_DIR env var (e.g., /var/www/example-shop-static/uploads/)
 */

import { existsSync, mkdirSync } from 'node:fs'
import { join, extname } from 'node:path'
import { randomUUID } from 'node:crypto'
import { verifyToken } from '~/server/utils/session-crypto'

export default defineEventHandler(async (event) => {
  // ── Auth ───────────────────────────────────────────────────────────────
  const session = verifyToken<any>(getCookie(event, 'hub_session'))
  if (!session) {
    throw createError({ statusCode: 401, message: 'Non authentifié' })
  }
  if (!session.isAdmin) {
    throw createError({ statusCode: 403, message: 'Accès réservé aux administrateurs' })
  }

  // ── Parse multipart ────────────────────────────────────────────────────
  const parts = await readMultipartFormData(event)
  if (!parts?.length) {
    throw createError({ statusCode: 400, message: 'Aucun fichier reçu' })
  }

  const filePart = parts.find(p => p.name === 'file')
  const destPart = parts.find(p => p.name === 'dest')
  if (!filePart?.data || !filePart.filename) {
    throw createError({ statusCode: 400, message: 'Champ "file" manquant' })
  }

  // Validation : type MIME image uniquement
  const mime = filePart.type ?? ''
  if (!mime.startsWith('image/')) {
    throw createError({ statusCode: 400, message: `Type non supporté : ${mime}` })
  }

  // Taille max 5 Mo
  if (filePart.data.length > 5 * 1024 * 1024) {
    throw createError({ statusCode: 400, message: 'Fichier trop volumineux (max 5 Mo)' })
  }

  const dest = destPart?.data?.toString('utf-8')?.replace(/[^a-zA-Z0-9_-]/g, '') || 'uploads'
  const ext = extname(filePart.filename).toLowerCase()
  const isSvg = ext === '.svg' || mime === 'image/svg+xml'
  const uid = randomUUID().slice(0, 12)
  const outFilename = isSvg
    ? `${uid}${ext}`
    : `${uid}.webp`

  // ── Répertoire de destination ──────────────────────────────────────────
  const runtime = useRuntimeConfig(event)
  const envDir = runtime.uploadStaticDir as string
  // VPS : NUXT_UPLOAD_STATIC_DIR pointe vers la racine Nginx (ex: /var/www/example-shop-static)
  // Local : fallback vers public/static/uploads (déjà inclut 'uploads')
  const uploadsBase = envDir
    ? join(envDir, 'uploads')
    : join(process.cwd(), 'public', 'static', 'uploads')

  const outDir = join(uploadsBase, dest)
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true })
  }

  const outPath = join(outDir, outFilename)

  // ── Conversion WebP (sauf SVG) ─────────────────────────────────────────
  if (isSvg) {
    // SVG : copie directe, pas de conversion
    const { writeFileSync } = await import('node:fs')
    writeFileSync(outPath, filePart.data)
  } else {
    const sharp = (await import('sharp')).default
    await sharp(filePart.data)
      .webp({ quality: 85 })
      .toFile(outPath)
  }

  // URL relative servie par Nginx (/static/uploads/{dest}/{file})
  const url = `/static/uploads/${dest}/${outFilename}`

  return { success: true, url, filename: outFilename }
})
