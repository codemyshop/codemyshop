import { Resvg } from '@resvg/resvg-js'

export type WrapOptions = {
  text: string
  maxWidth: number
  fontSize: number
  fontFamily: string
  fontFiles: string[]
  fontWeight?: number | string
  letterSpacing?: number
}

export type MeasureOptions = Omit<WrapOptions, 'text' | 'maxWidth'> & { text: string }

const escapeXml = (s: string) =>
  s.replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]!))

export function measureText(opts: MeasureOptions): number {
  const { text, fontSize, fontFamily, fontFiles, fontWeight = 'normal', letterSpacing = 0 } = opts
  if (!text) return 0
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100000" height="${fontSize * 2}">
    <text x="0" y="${fontSize}" font-family="${escapeXml(fontFamily)}" font-size="${fontSize}" font-weight="${fontWeight}" letter-spacing="${letterSpacing}">${escapeXml(text)}</text>
  </svg>`
  const resvg = new Resvg(svg, { font: { loadSystemFonts: false, fontFiles, defaultFontFamily: fontFamily } })
  const bbox = resvg.innerBBox()
  return bbox ? bbox.width : 0
}

export function wrapText(opts: WrapOptions): string[] {
  const { text, maxWidth } = opts
  const words = text.split(/\s+/).filter(Boolean)
  if (!words.length) return []

  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    const width = measureText({ ...opts, text: candidate })
    if (width <= maxWidth || !current) {
      current = candidate
    } else {
      lines.push(current)
      current = word
    }
  }
  if (current) lines.push(current)
  return lines
}
