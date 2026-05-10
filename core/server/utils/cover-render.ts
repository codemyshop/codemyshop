import { Resvg } from '@resvg/resvg-js'
import sharp from 'sharp'
import { resolve } from 'node:path'

import { wrapText, measureText } from './text-wrap'
import { getCoverTenantConfig } from './cover-tenant-config'
import { resolveBackground } from './cover-background'
import { resolveMask } from './cover-mask'
import { loadPersoForCover } from './cover-perso'

export const COVER_WIDTH = 1200
export const COVER_HEIGHT = 630

const FONT_REPO_DIR = resolve(process.cwd(), 'core/public/cover-assets/fonts')
const MONTSERRAT_BLACK = `${FONT_REPO_DIR}/Montserrat-Black.ttf`
const FONT_FAMILY = 'Montserrat'
const FONT_FILES = [MONTSERRAT_BLACK]

const PERSON_RIGHT_MARGIN = -60
const TEXT_MARGIN_X = 40
const TEXT_MARGIN_Y = 80
const SHADOW_OFFSET = 2
const SHADOW_COLOR = 'rgba(0,0,0,0.53)'

const escapeXml = (s: string) =>
  s.replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]!))

export type GenerateCoverOptions = {
  title: string
  tenant?: string
  forcePerso?: string
  usePhotoBg?: boolean
  withAvatar?: boolean
  expressionUrl?: string | null
  width?: number
  height?: number
}

type FittedText = {
  preLines: string[]
  mainLines: string[]
  mainSize: number
  preSize: number
  mainLineH: number
  preLineH: number
}

function fitText(
  preTitle: string,
  mainTitle: string,
  maxWidth: number,
  maxHeight: number,
  minSize = 28,
  maxSize = 220,
  preRatio = 0.6,
): FittedText {
  let lo = minSize
  let hi = maxSize
  let bestSize = minSize
  let bestMainLines: string[] = []
  let bestPreLines: string[] = []

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2)
    const preSize = Math.max(8, Math.round(mid * preRatio))
    const mainLines = wrapText({ text: mainTitle, maxWidth, fontSize: mid, fontFamily: FONT_FAMILY, fontFiles: FONT_FILES, fontWeight: 900 })
    const preLines = preTitle
      ? wrapText({ text: preTitle, maxWidth, fontSize: preSize, fontFamily: FONT_FAMILY, fontFiles: FONT_FILES, fontWeight: 900 })
      : []
    const mainLh = mid * 1.08
    const preLh = preSize * 1.08
    const totalH = mainLines.length * mainLh + preLines.length * preLh
    if (totalH <= maxHeight) {
      bestSize = mid
      bestMainLines = mainLines
      bestPreLines = preLines
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }

  const preSize = Math.max(8, Math.round(bestSize * preRatio))
  return {
    preLines: bestPreLines,
    mainLines: bestMainLines,
    mainSize: bestSize,
    preSize,
    mainLineH: bestSize * 1.08,
    preLineH: preSize * 1.08,
  }
}

function buildTextSvg(
  fitted: FittedText,
  textBoxX: number,
  textBoxY: number,
  textBoxWidth: number,
  textBoxHeight: number,
  preColor: string,
  mainColor: string,
  width: number,
  height: number,
): string {
  const { preLines, mainLines, mainSize, preSize, mainLineH, preLineH } = fitted
  const totalH = mainLines.length * mainLineH + preLines.length * preLineH
  let y = textBoxY + Math.max(0, (textBoxHeight - totalH) / 2)
  const out: string[] = []

  const drawLine = (line: string, fontSize: number, color: string, baseY: number) => {
    const baseline = baseY + fontSize
    const safe = escapeXml(line)
    out.push(
      `<text x="${textBoxX + SHADOW_OFFSET}" y="${baseline + SHADOW_OFFSET}" font-family="${FONT_FAMILY}" font-size="${fontSize}" font-weight="900" fill="${SHADOW_COLOR}">${safe}</text>`,
    )
    out.push(
      `<text x="${textBoxX}" y="${baseline}" font-family="${FONT_FAMILY}" font-size="${fontSize}" font-weight="900" fill="${color}">${safe}</text>`,
    )
  }

  for (const line of preLines) {
    drawLine(line, preSize, preColor, y)
    y += preLineH
  }
  for (const line of mainLines) {
    drawLine(line, mainSize, mainColor, y)
    y += mainLineH
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${out.join('')}</svg>`
}

function renderTextLayer(svg: string): Buffer {
  return new Resvg(svg, {
    font: { loadSystemFonts: false, fontFiles: FONT_FILES, defaultFontFamily: FONT_FAMILY },
  })
    .render()
    .asPng()
}

export async function generateCover(opts: GenerateCoverOptions): Promise<Buffer> {
  const width = opts.width ?? COVER_WIDTH
  const height = opts.height ?? COVER_HEIGHT
  const tenant = opts.tenant ?? 'ac-hub'
  const usePhotoBg = opts.usePhotoBg ?? true
  const withAvatar = opts.withAvatar ?? true

  const tcfg = await getCoverTenantConfig(tenant)

  const background = await resolveBackground({
    title: opts.title,
    width,
    height,
    usePhotoBg,
    fallbackRgb: tcfg.gradientRgb,
  })

  const mask = await resolveMask(tcfg.masqueFilename, tcfg.gradientRgb, width, height)

  let perso: { buffer: Buffer; meta: sharp.Metadata } | null = null
  if (withAvatar) {
    const picked = await loadPersoForCover({ forceName: opts.forcePerso, expressionUrl: opts.expressionUrl })
    if (picked) {
      const meta = await sharp(picked.buffer).metadata()
      perso = { buffer: picked.buffer, meta }
    }
  }

  let posX = width
  let posY = 0
  if (perso?.meta.width && perso.meta.height) {
    posX = width - perso.meta.width - PERSON_RIGHT_MARGIN
    posY = height - perso.meta.height
  }

  const textBoxX = TEXT_MARGIN_X
  const textBoxRight = perso ? posX - 10 : width - TEXT_MARGIN_X
  const textBoxWidth = Math.max(600, textBoxRight - textBoxX)
  const textBoxY = TEXT_MARGIN_Y
  const textBoxHeight = height - 2 * TEXT_MARGIN_Y

  const colonIdx = opts.title.indexOf(':')
  const preTitle = colonIdx > 0 ? `${opts.title.slice(0, colonIdx).trim()}:`.toUpperCase() : ''
  const mainTitle = (colonIdx > 0 ? opts.title.slice(colonIdx + 1).trim() : opts.title.trim()).toUpperCase()

  const fitted = fitText(preTitle, mainTitle, textBoxWidth, textBoxHeight)
  const svg = buildTextSvg(fitted, textBoxX, textBoxY, textBoxWidth, textBoxHeight, tcfg.preColor, tcfg.mainColor, width, height)
  const textLayer = renderTextLayer(svg)

  const composites: sharp.OverlayOptions[] = [{ input: mask, top: 0, left: 0 }]
  composites.push({ input: textLayer, top: 0, left: 0 })
  if (perso) composites.push({ input: perso.buffer, top: posY, left: posX })

  return sharp(background).composite(composites).png().toBuffer()
}

export const _internal = { measureText, fitText, buildTextSvg, FONT_FAMILY, FONT_FILES }
