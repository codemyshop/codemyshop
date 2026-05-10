/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /api/instagram/posts?limit=24&offset=0&type=IMAGE
 *
 * Reads Instagram posts from cs_instagram_post (+ _lang FR).
 * Zero Graph API calls at runtime — offline paginated sync (Nitro Task,
 * pending work item #43, old Python scripts archived 2026-05-03).
 * → no rate-limiting, no token expiration, no expiring CDN URLs
 * (image_url field may be stale, will be progressively served via
 * local_path when download is enabled).
 *
 * Pagination classique : limit ≤ 100, offset ≥ 0. Tri anti-chrono par
 * posted_at. Filtre optionnel par media_type.
 */

import {
  countInstagramPosts,
  listInstagramPosts,
} from '~/modules/instagram/server/utils/instagram'

interface Post {
  id:         number
  igId:       string
  caption:    string
  mediaType:  'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'
  imageUrl:   string
  permalink:  string
  postedAt:   string
}

export default defineEventHandler(async (event): Promise<{ items: Post[]; total: number; hasMore: boolean }> => {
  const { limit, offset, type } = getQuery(event)
  const lim = Math.min(Math.max(Number(limit) || 24, 1), 100)
  const off = Math.max(Number(offset) || 0, 0)
  const mediaType = String(type || '').trim().toUpperCase() || null

  try {
    const total = await countInstagramPosts(mediaType, { event })
    if (total === 0) return { items: [], total: 0, hasMore: false }

    const rows = await listInstagramPosts(mediaType, lim, off, { event })

    const items: Post[] = rows.map((r) => ({
      id:        Number(r.id_post),
      igId:      r.ig_id,
      caption:   r.caption || '',
      mediaType: r.media_type,
      // Priorité : local_path (quand le sync download sera activé) > image/thumb CDN
      imageUrl:  r.local_path || (r.media_type === 'VIDEO' ? (r.thumbnail_url || '') : (r.image_url || '')),
      permalink: r.permalink,
      postedAt:  typeof r.posted_at === 'string' ? r.posted_at : new Date(r.posted_at).toISOString(),
    })).filter(p => p.imageUrl)

    return {
      items,
      total,
      hasMore: off + items.length < total,
    }
  } catch (err: any) {
    if (err?.code === 'ER_NO_SUCH_TABLE' || err?.errno === 1146) {
      return { items: [], total: 0, hasMore: false }
    }
    console.error('[instagram/posts] DB error:', err?.message)
    return { items: [], total: 0, hasMore: false }
  }
})
