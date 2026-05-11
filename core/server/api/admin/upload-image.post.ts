

import { existsSync, mkdirSync } from 'node:fs'
import { join, extname } from 'node:path'
import { randomUUID } from 'node:crypto'
import { verifyToken } from '~/server/utils/session-crypto'

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
  const destPart = parts.find(p => p.name === 'dest')
  if (!filePart?.data || !filePart.filename) {
    throw createError({ statusCode: 400, message: 'Champ "file" manquant' })
  }

  
  const mime = filePart.type ?? ''
  if (!mime.startsWith('image/')) {
    throw createError({ statusCode: 400, message: `Type non supporté : ${mime}` })
  }

  
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

  
  const runtime = useRuntimeConfig(event)
  const envDir = runtime.uploadStaticDir as string
  
  
  const uploadsBase = envDir
    ? join(envDir, 'uploads')
    : join(process.cwd(), 'public', 'static', 'uploads')

  const outDir = join(uploadsBase, dest)
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true })
  }

  const outPath = join(outDir, outFilename)

  
  if (isSvg) {
    
    const { writeFileSync } = await import('node:fs')
    writeFileSync(outPath, filePart.data)
  } else {
    const sharp = (await import('sharp')).default
    await sharp(filePart.data)
      .webp({ quality: 85 })
      .toFile(outPath)
  }

  
  const url = `/static/uploads/${dest}/${outFilename}`

  return { success: true, url, filename: outFilename }
})
