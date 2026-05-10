import { getPgClient } from './db-pg-adapter'
import { getCoverTenantConfig } from './cover-tenant-config'
import { renderCarouselSlides, type CarouselSlide } from './carousel-render'
import { saveCarousel } from './carousel-storage'

type QueueRow = {
  id_carousel: number
  tenant: string
  id_cms: number
  title: string
  slug: string
  slides_json: string
}

export type ProcessCarouselQueueResult = {
  scanned: number
  processed: number
  errors: number
  items: Array<{
    id: number
    slug: string
    status: 'done' | 'error' | 'skipped'
    pdfUrl?: string
    slides?: number
    bytes?: number
    durationMs?: number
    error?: string
  }>
}

function parseSlides(raw: string): CarouselSlide[] {
  const data = JSON.parse(raw)
  if (!Array.isArray(data)) throw new Error('slides_json must be an array')
  return data.map((s: any) => ({
    title: String(s?.title ?? ''),
    text: typeof s?.text === 'string' ? s.text : '',
    role: typeof s?.role === 'string' ? s.role : undefined,
  }))
}

export async function processCarouselQueue(opts: {
  limit?: number
  dryRun?: boolean
} = {}): Promise<ProcessCarouselQueueResult> {
  const limit = Math.max(1, Math.min(20, opts.limit ?? 3))
  const dryRun = opts.dryRun ?? false
  const sql = getPgClient()

  const claimed = await sql<QueueRow[]>`
    UPDATE cs_main.cs_carousel_queue
    SET status = 'processing', date_upd = NOW()
    WHERE id_carousel IN (
      SELECT id_carousel FROM cs_main.cs_carousel_queue
      WHERE status = 'pending'
      ORDER BY date_add ASC
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id_carousel, tenant, id_cms, title, slug, slides_json
  `

  const result: ProcessCarouselQueueResult = {
    scanned: claimed.length,
    processed: 0,
    errors: 0,
    items: [],
  }

  for (const row of claimed) {
    const t0 = Date.now()
    if (dryRun) {
      await sql`
        UPDATE cs_main.cs_carousel_queue
        SET status = 'pending', date_upd = NOW()
        WHERE id_carousel = ${row.id_carousel}
      `
      result.items.push({ id: row.id_carousel, slug: row.slug, status: 'skipped' })
      continue
    }

    try {
      const slides = parseSlides(row.slides_json)
      if (slides.length < 3) throw new Error(`min 3 slides required (got ${slides.length})`)

      const tcfg = await getCoverTenantConfig(row.tenant)
      const pngs = renderCarouselSlides(slides, tcfg)
      const saved = await saveCarousel({ slidePngs: pngs, slug: row.slug, siteUrl: tcfg.siteUrl })

      await sql`
        UPDATE cs_main.cs_carousel_queue
        SET status = 'done', pdf_url = ${saved.url}, error_msg = NULL, date_upd = NOW()
        WHERE id_carousel = ${row.id_carousel}
      `
      result.processed++
      result.items.push({
        id: row.id_carousel,
        slug: row.slug,
        status: 'done',
        pdfUrl: saved.url,
        slides: saved.slides,
        bytes: saved.bytes,
        durationMs: Date.now() - t0,
      })
    } catch (err: any) {
      const msg = err?.message ?? String(err)
      await sql`
        UPDATE cs_main.cs_carousel_queue
        SET status = 'error', error_msg = ${msg.slice(0, 255)}, date_upd = NOW()
        WHERE id_carousel = ${row.id_carousel}
      `
      result.errors++
      result.items.push({
        id: row.id_carousel,
        slug: row.slug,
        status: 'error',
        error: msg,
        durationMs: Date.now() - t0,
      })
    }
  }

  return result
}
