import PDFDocument from 'pdfkit'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { SLIDE_W, SLIDE_H } from './carousel-render'
import { seoShortSlug } from './cover-storage'

export const CAROUSEL_DIR = resolve(process.cwd(), '.output/public/blog-covers')

export type SavedCarousel = {
  filename: string
  url: string
  bytes: number
  slides: number
}

async function bufferPdf(slidePngs: Buffer[]): Promise<Buffer> {
  return new Promise<Buffer>((resolveBuf, reject) => {
    const doc = new PDFDocument({
      size: [SLIDE_W, SLIDE_H],
      margin: 0,
      autoFirstPage: false,
    })
    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolveBuf(Buffer.concat(chunks)))
    doc.on('error', reject)
    for (const png of slidePngs) {
      doc.addPage({ size: [SLIDE_W, SLIDE_H], margin: 0 })
      doc.image(png, 0, 0, { width: SLIDE_W, height: SLIDE_H })
    }
    doc.end()
  })
}

export async function saveCarousel(opts: {
  slidePngs: Buffer[]
  slug: string
  siteUrl: string
}): Promise<SavedCarousel> {
  if (!opts.slidePngs.length) throw new Error('saveCarousel: no slides')
  const pdf = await bufferPdf(opts.slidePngs)
  const shortSlug = seoShortSlug(opts.slug)
  const ts = Math.floor(Date.now() / 1000)
  const filename = `carousel-${shortSlug}-${ts}.pdf`
  await mkdir(CAROUSEL_DIR, { recursive: true })
  await writeFile(`${CAROUSEL_DIR}/${filename}`, pdf)
  return {
    filename,
    url: `${opts.siteUrl}/blog-covers/${filename}`,
    bytes: pdf.length,
    slides: opts.slidePngs.length,
  }
}
