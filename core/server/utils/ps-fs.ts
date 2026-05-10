/**
 *
 * Direct FS helpers for the PrestaShop volume — Phase 9b.3 task
 * headless-modules-ts. Used by 3 endpoints that need to write to
 * /var/www/html/{download,img/c} : attachments.post, upload-cover, migrate-webp.
 *
 * Paths are resolved from 2 optional environment variables (per tenant):
 *   - PS_DOWNLOAD_DIR_<KEY>      ex: /ps_fs/download
 *   - PS_IMG_CATEGORY_DIR_<KEY>  ex: /ps_fs/img/c
 *
 * If the variable is not defined on the Nuxt side (e.g., VPS without co-location with PS),
 * `resolve*` returns null and the calling endpoint falls back to `psProxyMultipart`.
 * This is intentional: we keep a compatibility path while all tenants
 * do not have cross-container mount or NFS.
 */

import { existsSync, mkdirSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { clientIdToEnvKey, resolveTenantClientId } from './ps-tenant'

function readEnvDir(event: any, suffix: 'DOWNLOAD_DIR' | 'IMG_CATEGORY_DIR'): string | null {
  const clientId = resolveTenantClientId(event)
  const envKey = clientIdToEnvKey(clientId)
  const dir = (process.env[`PS_${suffix}_${envKey}`] || '').trim()
  return dir || null
}

export function resolvePsDownloadDir(event: any): string | null {
  return readEnvDir(event, 'DOWNLOAD_DIR')
}

export function resolvePsImgCategoryDir(event: any): string | null {
  return readEnvDir(event, 'IMG_CATEGORY_DIR')
}

/** Crée le dossier si absent (mode 0755). No-op si existe déjà. */
function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true, mode: 0o755 })
}

/**
 * Writes the buffer to `{dir}/{sha1}` (perms 0644). Overrides if exists.
 * Returns the absolute path written.
 */
export function writeAttachmentFile(event: any, sha1: string, buffer: Buffer): string {
  const dir = resolvePsDownloadDir(event)
  if (!dir) throw new Error('PS_DOWNLOAD_DIR_<KEY> non défini — fallback psProxy requis')
  if (!/^[a-f0-9]{40}$/i.test(sha1)) throw new Error('sha1 invalide')
  ensureDir(dir)
  const path = join(dir, sha1)
  writeFileSync(path, buffer, { mode: 0o644 })
  return path
}

/**
 * Writes an image buffer to `/img/c/{filename}` (perms 0644). Overrides if exists.
 * Garde-fou : `filename` doit matcher /^[a-z0-9_.-]+$/i.
 */
export function writeCategoryImage(event: any, filename: string, buffer: Buffer): string {
  const dir = resolvePsImgCategoryDir(event)
  if (!dir) throw new Error('PS_IMG_CATEGORY_DIR_<KEY> non défini — fallback psProxy requis')
  if (!/^[a-z0-9_.-]+$/i.test(filename)) throw new Error(`filename invalide : ${filename}`)
  ensureDir(dir)
  const path = join(dir, filename)
  writeFileSync(path, buffer, { mode: 0o644 })
  return path
}

/**
 * Deletes all existing variants for a category: `{id}-*.webp`,
 * `{id}.jpg`, `{id}_thumb.jpg`, `{id}-thumb.webp`. Tolerant of missing files.
 * Returns the list of actually deleted files.
 */
export function purgeCategoryImagesForId(event: any, idCategory: number, variant: 'cover' | 'thumb' | 'all' = 'all'): string[] {
  const dir = resolvePsImgCategoryDir(event)
  if (!dir || !existsSync(dir) || idCategory <= 0) return []
  const removed: string[] = []
  const prefixCover = `${idCategory}-`
  const legacyJpg = `${idCategory}.jpg`
  const legacyThumb = `${idCategory}_thumb.jpg`
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return []
  }
  for (const name of entries) {
    const isCoverVariant = name.startsWith(prefixCover) && name.endsWith('.webp') && !name.includes('-thumb')
    const isThumbVariant = (name.startsWith(prefixCover) && name.endsWith('-thumb.webp')) || name === legacyThumb
    const isLegacyJpg = name === legacyJpg
    const matchVariant =
      variant === 'all'
        ? (isCoverVariant || isThumbVariant || isLegacyJpg)
        : variant === 'cover'
        ? (isCoverVariant || isLegacyJpg)
        : isThumbVariant
    if (!matchVariant) continue
    try {
      unlinkSync(join(dir, name))
      removed.push(name)
    } catch { /* tolérant */ }
  }
  return removed
}

/** List of legacy JPG files in `/img/c/{id}.jpg` to migrate (for `migrate-webp`). */
export function listLegacyCategoryJpgs(event: any): Array<{ idCategory: number; filename: string; absPath: string }> {
  const dir = resolvePsImgCategoryDir(event)
  if (!dir || !existsSync(dir)) return []
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return []
  }
  const out: Array<{ idCategory: number; filename: string; absPath: string }> = []
  for (const name of entries) {
    const m = /^(\d+)\.jpg$/.exec(name)
    if (!m) continue
    out.push({ idCategory: Number(m[1]), filename: name, absPath: join(dir, name) })
  }
  return out
}

/** True if we can write directly to FS for the current tenant. */
export function psFsCanWriteDownload(event: any): boolean {
  return !!resolvePsDownloadDir(event)
}
export function psFsCanWriteImgCategory(event: any): boolean {
  return !!resolvePsImgCategoryDir(event)
}
