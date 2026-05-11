

import { createHmac } from 'node:crypto'

export function generateWatermark(clientId: string, taskType: string): string {
  const secret = process.env.API_ENCRYPTION_KEY || process.env.NUXT_SECRET || 'codemyshop'
  const timestamp = Math.floor(Date.now() / 3600000) 
  const payload = `${clientId}:${taskType}:${timestamp}`

  return createHmac('sha256', secret).update(payload).digest('hex').slice(0, 12)
}

export function embedWatermark(text: string, watermarkHex: string): string {
  
  const zwChars = ['\u200B', '\u200C', '\u200D', '\uFEFF']
  const encoded = watermarkHex
    .split('')
    .map(c => {
      const idx = parseInt(c, 16) % 4
      return zwChars[idx]
    })
    .join('')

  
  const firstSpace = text.indexOf(' ')
  if (firstSpace === -1) return text + encoded

  return text.slice(0, firstSpace) + encoded + text.slice(firstSpace)
}

export function extractWatermark(text: string): string | null {
  const zwChars = ['\u200B', '\u200C', '\u200D', '\uFEFF']
  const zwRegex = /[\u200B\u200C\u200D\uFEFF]{4,}/
  const match = text.match(zwRegex)

  if (!match) return null

  return match[0]
    .split('')
    .map(c => {
      const idx = zwChars.indexOf(c)
      return idx >= 0 ? idx.toString(16) : ''
    })
    .join('')
}

export function watermarkResponse(text: string, clientId: string, taskType: string): {
  text: string
  watermark: string
} {
  const wm = generateWatermark(clientId, taskType)
  return {
    text: embedWatermark(text, wm),
    watermark: wm,
  }
}
