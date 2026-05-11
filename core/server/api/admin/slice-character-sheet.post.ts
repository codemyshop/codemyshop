

import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { verifyToken } from '~/server/utils/session-crypto'

const EXPRESSION_ORDER = [
  'neutral', 'happy', 'thinking', 'concerned', 'excited',
  'skeptical', 'curious', 'determined', 'surprised', 'contemplative',
]

const COLS = 5
const ROWS = 2

export default defineEventHandler(async (event) => {
  
  const session = verifyToken<any>(getCookie(event, 'hub_session'))
  if (!session) {
    throw createError({ statusCode: 401, message: 'Non authentifié' })
  }
  if (!session.isAdmin) {
    throw createError({ statusCode: 403, message: 'Accès réservé aux administrateurs' })
  }

  
  const parts = await readMultipartFormData(event)
  if (!parts?.length) {
    throw createError({ statusCode: 400, message: 'Aucun fichier reçu' })
  }

  const filePart = parts.find(p => p.name === 'file')
  const personaPart = parts.find(p => p.name === 'persona')
  if (!filePart?.data || !filePart.filename) {
    throw createError({ statusCode: 400, message: 'Champ "file" manquant' })
  }

  const mime = filePart.type ?? ''
  if (!mime.startsWith('image/')) {
    throw createError({ statusCode: 400, message: `Type non supporté : ${mime}` })
  }

  
  if (filePart.data.length > 15 * 1024 * 1024) {
    throw createError({ statusCode: 400, message: 'Fichier trop volumineux (max 15 Mo)' })
  }

  const personaSlug = personaPart?.data?.toString('utf-8')?.replace(/[^a-zA-Z0-9_-]/g, '') || 'persona'
  const uid = randomUUID().slice(0, 8)

  
  const runtime = useRuntimeConfig(event)
  const envDir = runtime.uploadStaticDir as string
  const uploadsBase = envDir
    ? join(envDir, 'uploads')
    : join(process.cwd(), 'public', 'static', 'uploads')

  const sheetsDir = join(uploadsBase, 'avatars-sheets')
  const cellsDir = join(uploadsBase, 'avatars-expressions')
  if (!existsSync(sheetsDir)) mkdirSync(sheetsDir, { recursive: true })
  if (!existsSync(cellsDir)) mkdirSync(cellsDir, { recursive: true })

  const sharp = (await import('sharp')).default

  
  const sheetFilename = `${personaSlug}-${uid}-sheet.webp`
  const sheetPath = join(sheetsDir, sheetFilename)
  await sharp(filePart.data)
    .webp({ quality: 90 })
    .toFile(sheetPath)
  const sheetUrl = `/static/uploads/avatars-sheets/${sheetFilename}`

  
  const metadata = await sharp(filePart.data).metadata()
  const imgWidth = metadata.width!
  const imgHeight = metadata.height!

  
  
  
  const rowHeight = Math.floor(imgHeight / ROWS)
  const cellWidth = Math.floor(imgWidth / COLS)
  const labelHeight = Math.floor(rowHeight * 0.10)
  const usableHeight = rowHeight - labelHeight

  
  const cells: { slug: string; url: string }[] = []

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const idx = row * COLS + col
      const slug = EXPRESSION_ORDER[idx]

      const left = col * cellWidth
      const top = row * rowHeight

      const cellFilename = `${personaSlug}-${uid}-${slug}.webp`
      const cellPath = join(cellsDir, cellFilename)

      await sharp(filePart.data)
        .extract({
          left,
          top,
          width: cellWidth,
          height: usableHeight,
        })
        .webp({ quality: 85 })
        .toFile(cellPath)

      cells.push({
        slug,
        url: `/static/uploads/avatars-expressions/${cellFilename}`,
      })
    }
  }

  return { success: true, sheetUrl, cells }
})
