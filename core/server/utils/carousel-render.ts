import { Resvg } from '@resvg/resvg-js'
import { resolve } from 'node:path'

import { wrapText } from './text-wrap'
import type { CoverTenantConfig } from './cover-tenant-config'

export const SLIDE_W = 1080
export const SLIDE_H = 1080

const FONT_REPO_DIR = resolve(process.cwd(), 'core/public/cover-assets/fonts')
const MONTSERRAT_BLACK = `${FONT_REPO_DIR}/Montserrat-Black.ttf`
const FONT_FAMILY = 'Montserrat'
const FONT_FILES = [MONTSERRAT_BLACK]

const ACCENT_BAR_H = 8
const MARGIN_X = 60

export type CarouselSlide = {
  title: string
  text?: string
  role?: string  
}

const escapeXml = (s: string) =>
  s.replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]!))

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`
}

function pickTitleSize(title: string): number {
  if (title.length < 30) return 64
  if (title.length < 50) return 52
  return 42
}

export function renderSlide(
  slide: CarouselSlide,
  index: number,
  total: number,
  tcfg: CoverTenantConfig,
): Buffer {
  const bgHex = rgbToHex(...tcfg.gradientRgb)
  const accentHex = tcfg.accentColor
  const subtitleHex = tcfg.subtitleColor
  const textHex = tcfg.mainColor
  const ctaHex = tcfg.ctaColor

  const title = (slide.title || '').trim()
  const text = (slide.text || '').trim()
  const titleSize = pickTitleSize(title)
  const titleColor = slide.role === 'hook' || slide.role === 'cta' ? ctaHex : textHex
  const textSize = 30
  const titleLineH = titleSize * 1.15
  const textLineH = textSize * 1.35
  const maxTextW = SLIDE_W - 2 * MARGIN_X

  const titleLines = wrapText({ text: title, maxWidth: maxTextW, fontSize: titleSize, fontFamily: FONT_FAMILY, fontFiles: FONT_FILES, fontWeight: 900 })
  const textLines = text ? wrapText({ text, maxWidth: maxTextW, fontSize: textSize, fontFamily: FONT_FAMILY, fontFiles: FONT_FILES }) : []
  const totalH = titleLines.length * titleLineH + (textLines.length ? 30 + textLines.length * textLineH : 0)
  let cursorY = Math.max(80, (SLIDE_H - totalH) / 2 - 20)

  const elements: string[] = []
  elements.push(`<rect x="0" y="0" width="${SLIDE_W}" height="${SLIDE_H}" fill="${bgHex}"/>`)
  elements.push(`<rect x="0" y="0" width="${SLIDE_W}" height="${ACCENT_BAR_H}" fill="${accentHex}"/>`)

  const numText = `${index}/${total}`
  const numSize = 28
  elements.push(
    `<text x="${SLIDE_W - 40}" y="${30 + numSize}" text-anchor="end" font-family="${FONT_FAMILY}" font-size="${numSize}" font-weight="900" fill="${subtitleHex}">${escapeXml(numText)}</text>`,
  )

  for (const line of titleLines) {
    elements.push(
      `<text x="${MARGIN_X}" y="${cursorY + titleSize}" font-family="${FONT_FAMILY}" font-size="${titleSize}" font-weight="900" fill="${titleColor}">${escapeXml(line)}</text>`,
    )
    cursorY += titleLineH
  }

  if (textLines.length) {
    cursorY += 30
    for (const line of textLines) {
      elements.push(
        `<text x="${MARGIN_X}" y="${cursorY + textSize}" font-family="${FONT_FAMILY}" font-size="${textSize}" font-weight="900" fill="${subtitleHex}">${escapeXml(line)}</text>`,
      )
      cursorY += textLineH
    }
  }

  if (index < total) {
    const arrowSize = 22
    elements.push(
      `<text x="${SLIDE_W - 40}" y="${SLIDE_H - 50 + arrowSize}" text-anchor="end" font-family="${FONT_FAMILY}" font-size="${arrowSize}" font-weight="900" fill="${accentHex}" fill-opacity="0.706">${escapeXml('Glisser →')}</text>`,
    )
  }

  const brandSize = 20
  if (tcfg.brand) {
    elements.push(
      `<text x="${MARGIN_X}" y="${SLIDE_H - 50 + brandSize}" font-family="${FONT_FAMILY}" font-size="${brandSize}" font-weight="900" fill="${subtitleHex}">${escapeXml(tcfg.brand)}</text>`,
    )
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SLIDE_W}" height="${SLIDE_H}">${elements.join('')}</svg>`
  return new Resvg(svg, {
    font: { loadSystemFonts: false, fontFiles: FONT_FILES, defaultFontFamily: FONT_FAMILY },
  })
    .render()
    .asPng()
}

export function renderCarouselSlides(slides: CarouselSlide[], tcfg: CoverTenantConfig): Buffer[] {
  const total = slides.length
  return slides.map((s, i) => renderSlide(s, i + 1, total, tcfg))
}
