import sharp from 'sharp'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

export const BLOG_COVERS_DIR = resolve(process.cwd(), '.output/public/blog-covers')
export const COVER_QUALITY = 90
export const THUMB_QUALITY = 85
export const THUMB_WIDTH = 600
export const THUMB_HEIGHT = 315

export type SavedCoverSet = {
  cover: { filename: string; url: string; bytes: number }
  thumb: { filename: string; url: string; bytes: number }
}

export function seoShortSlug(slug: string, maxLen = 30, keepWords = 3): string {
  const cleaned = slug.toLowerCase().replace(/[^a-z0-9\s-]/g, '')
  const words = cleaned.split(/\s+/).filter(Boolean)
  let out = words.slice(0, keepWords).join('-')
  if (out.length > maxLen) out = out.slice(0, maxLen).replace(/-+$/, '')
  return out || 'article'
}

async function ensureDir(): Promise<void> {
  await mkdir(BLOG_COVERS_DIR, { recursive: true })
}

async function saveBuffer(buffer: Buffer, filename: string): Promise<number> {
  await ensureDir()
  const path = `${BLOG_COVERS_DIR}/${filename}`
  await writeFile(path, buffer)
  return buffer.length
}

export async function saveCoverSet(opts: {
  slug: string
  siteUrl: string
  coverPng: Buffer
  width: number
  height: number
}): Promise<SavedCoverSet> {
  const shortSlug = seoShortSlug(opts.slug)
  const ts = Math.floor(Date.now() / 1000)

  const coverWebp = await sharp(opts.coverPng)
    .webp({ quality: COVER_QUALITY })
    .toBuffer()
  const coverFile = `cover-${shortSlug}-${ts}.webp`
  const coverBytes = await saveBuffer(coverWebp, coverFile)

  const thumbWebp = await sharp(opts.coverPng)
    .resize(THUMB_WIDTH, THUMB_HEIGHT, { fit: 'cover', position: 'center' })
    .webp({ quality: THUMB_QUALITY })
    .toBuffer()
  const thumbFile = `thumb-${shortSlug}-${ts}.webp`
  const thumbBytes = await saveBuffer(thumbWebp, thumbFile)

  return {
    cover: { filename: coverFile, url: `${opts.siteUrl}/blog-covers/${coverFile}`, bytes: coverBytes },
    thumb: { filename: thumbFile, url: `${opts.siteUrl}/blog-covers/${thumbFile}`, bytes: thumbBytes },
  }
}
