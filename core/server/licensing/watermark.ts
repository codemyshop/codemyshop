/**
 *
 * Invisible watermarking of AI responses.
 * Inserts a traceable identifier into the generated content.
 * Permet de prouver l'origine en cas de vol de code ou de contenu.
 */
import { createHmac } from 'node:crypto'

/**
 * Generates an invisible watermark for AI-generated content.
 * The watermark is a short hash encoded in zero-width Unicode characters.
 */
export function generateWatermark(clientId: string, taskType: string): string {
  const secret = process.env.API_ENCRYPTION_KEY || process.env.NUXT_SECRET || 'codemyshop'
  const timestamp = Math.floor(Date.now() / 3600000) // arrondi à l'heure
  const payload = `${clientId}:${taskType}:${timestamp}`

  return createHmac('sha256', secret).update(payload).digest('hex').slice(0, 12)
}

/**
 * Inserts an invisible watermark into text.
 * Uses zero-width characters (invisible to the naked eye).
 *
 * U+200B = Zero Width Space
 * U+200C = Zero Width Non-Joiner
 * U+200D = Zero Width Joiner
 * U+FEFF = Zero Width No-Break Space
 */
export function embedWatermark(text: string, watermarkHex: string): string {
  // Convertir le hex en séquence de caractères zero-width
  const zwChars = ['\u200B', '\u200C', '\u200D', '\uFEFF']
  const encoded = watermarkHex
    .split('')
    .map(c => {
      const idx = parseInt(c, 16) % 4
      return zwChars[idx]
    })
    .join('')

  // Insérer entre le 1er et le 2e mot du texte (invisible)
  const firstSpace = text.indexOf(' ')
  if (firstSpace === -1) return text + encoded

  return text.slice(0, firstSpace) + encoded + text.slice(firstSpace)
}

/**
 * Extracts a watermark from text.
 * Returns the hex of the watermark or null if absent.
 */
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

/**
 * Applies the watermark to an AI response.
 * Returns the watermarked text + the watermark in clear text for logs.
 */
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
