/**
 *
 * Instagram facade — database archive of Instagram posts (populated by
 * the Instagram sync automation). Zero Graph API calls at runtime.
 *
 * Source of truth: PostgreSQL `cs_main.cs_instagram_post`
 * (+ paired `_lang` table for caption i18n, backlogs #235 + #236 closed
 * 2026-05-03).
 *
 * Surface :
 *  - countInstagramPosts(mediaType?) — total actif
 * - listInstagramPosts(filter, idLang) — paginated reverse-chronological, caption JOIN _lang
 */

import { sql } from 'drizzle-orm'
import { usePocPg } from '../../../../server/db/drizzle-pg'

interface InstagramContext {
  event?: any
  clientId?: string
}

export interface InstagramPostRow {
  id_post: number
  ig_id: string
  caption: string | null
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'
  image_url: string | null
  thumbnail_url: string | null
  local_path: string | null
  permalink: string
  posted_at: string | Date
}

const ALLOWED_TYPES = ['IMAGE', 'VIDEO', 'CAROUSEL_ALBUM'] as const

export async function countInstagramPosts(
  mediaType: string | null,
  _ctx: InstagramContext = {},
): Promise<number> {
  const conds: any[] = [sql`active = 1`]
  if (mediaType && (ALLOWED_TYPES as readonly string[]).includes(mediaType)) {
    conds.push(sql`media_type = ${mediaType}`)
  }
  const rows = await usePocPg().execute<{ total: number }>(sql`
    SELECT COUNT(*)::int AS total
      FROM cs_main.cs_instagram_post
     WHERE ${sql.join(conds, sql` AND `)}
  `)
  return Number((rows as any[])[0]?.total || 0)
}

export async function listInstagramPosts(
  mediaType: string | null,
  limit: number,
  offset: number,
  idLang: number = 1,
  _ctx: InstagramContext = {},
): Promise<InstagramPostRow[]> {
  const conds: any[] = [sql`p.active = 1`]
  if (mediaType && (ALLOWED_TYPES as readonly string[]).includes(mediaType)) {
    conds.push(sql`p.media_type = ${mediaType}`)
  }
  const rows = await usePocPg().execute<InstagramPostRow>(sql`
    SELECT p.id_post, p.ig_id, pl.caption, p.media_type, p.image_url,
           p.thumbnail_url, p.local_path, p.permalink, p.posted_at
      FROM cs_main.cs_instagram_post p
 LEFT JOIN cs_main.cs_instagram_post_lang pl
        ON pl.id_post = p.id_post AND pl.id_lang = ${idLang}
     WHERE ${sql.join(conds, sql` AND `)}
     ORDER BY p.posted_at DESC, p.id_post DESC
     LIMIT ${limit} OFFSET ${offset}
  `)
  return (rows as any[]) as InstagramPostRow[]
}
