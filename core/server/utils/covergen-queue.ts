import { getPgClient } from './db-pg-adapter'
import { generateCover, COVER_WIDTH, COVER_HEIGHT } from './cover-render'
import { getCoverTenantConfig } from './cover-tenant-config'
import { saveCoverSet, type SavedCoverSet } from './cover-storage'

type QueueRow = {
  id_covergen: number
  tenant: string
  id_cms: number
  title: string
  slug: string
  with_avatar: number
  expression_image_url: string | null
}

export type ProcessQueueResult = {
  scanned: number
  processed: number
  errors: number
  items: Array<{
    id: number
    slug: string
    status: 'done' | 'error' | 'skipped'
    coverUrl?: string
    thumbUrl?: string
    durationMs?: number
    error?: string
  }>
}

export async function processCoverQueue(opts: {
  limit?: number
  dryRun?: boolean
} = {}): Promise<ProcessQueueResult> {
  const limit = Math.max(1, Math.min(50, opts.limit ?? 5))
  const dryRun = opts.dryRun ?? false
  const sql = getPgClient()

  const claimed = await sql<QueueRow[]>`
    UPDATE cs_main.cs_covergen_queue
    SET status = 'processing', date_upd = NOW()
    WHERE id_covergen IN (
      SELECT id_covergen FROM cs_main.cs_covergen_queue
      WHERE status = 'pending'
      ORDER BY date_add ASC
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id_covergen, tenant, id_cms, title, slug, with_avatar, expression_image_url
  `

  const result: ProcessQueueResult = {
    scanned: claimed.length,
    processed: 0,
    errors: 0,
    items: [],
  }

  for (const row of claimed) {
    const t0 = Date.now()
    if (dryRun) {
      await sql`
        UPDATE cs_main.cs_covergen_queue
        SET status = 'pending', date_upd = NOW()
        WHERE id_covergen = ${row.id_covergen}
      `
      result.items.push({ id: row.id_covergen, slug: row.slug, status: 'skipped' })
      continue
    }

    try {
      const tcfg = await getCoverTenantConfig(row.tenant)
      const coverPng = await generateCover({
        title: row.title,
        tenant: row.tenant,
        usePhotoBg: true,
        withAvatar: row.with_avatar === 1,
        expressionUrl: row.expression_image_url,
      })
      const saved: SavedCoverSet = await saveCoverSet({
        slug: row.slug,
        siteUrl: tcfg.siteUrl,
        coverPng,
        width: COVER_WIDTH,
        height: COVER_HEIGHT,
      })
      await sql`
        UPDATE cs_main.cs_covergen_queue
        SET status = 'done',
            cover_url = ${saved.cover.url},
            thumb_url = ${saved.thumb.url},
            error_msg = NULL,
            date_upd = NOW()
        WHERE id_covergen = ${row.id_covergen}
      `
      result.processed++
      result.items.push({
        id: row.id_covergen,
        slug: row.slug,
        status: 'done',
        coverUrl: saved.cover.url,
        thumbUrl: saved.thumb.url,
        durationMs: Date.now() - t0,
      })
    } catch (err: any) {
      const msg = err?.message ?? String(err)
      await sql`
        UPDATE cs_main.cs_covergen_queue
        SET status = 'error', error_msg = ${msg.slice(0, 255)}, date_upd = NOW()
        WHERE id_covergen = ${row.id_covergen}
      `
      result.errors++
      result.items.push({
        id: row.id_covergen,
        slug: row.slug,
        status: 'error',
        error: msg,
        durationMs: Date.now() - t0,
      })
    }
  }

  return result
}
