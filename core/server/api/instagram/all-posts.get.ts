/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /api/instagram/all-posts?max=200
 *
 * Fetches ALL Instagram account posts by paginating through
 * paging.next of the Graph API (Instagram Login). Used for a gallery
 * exhaustive or an export/archive.
 *
 * Garde-fous :
 * - default cap of 200 posts (max 500) to avoid flooding the API
 *   - cache 1h (defineCachedEventHandler)
 * - abandon as soon as paging.next is absent or the cap is exceeded
 */

interface IgMediaRaw {
  id:              string
  caption?:        string
  media_type:      'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'
  media_url?:      string
  thumbnail_url?:  string
  permalink:       string
  timestamp:       string
}

interface IgMedia {
  id:          string
  caption:     string
  mediaType:   IgMediaRaw['media_type']
  imageUrl:    string
  permalink:   string
  timestamp:   string
}

interface PagedResponse {
  data?:   IgMediaRaw[]
  paging?: { next?: string }
}

const FIELDS = 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp'
const PAGE_SIZE = 50

export default defineCachedEventHandler(async (event): Promise<{ items: IgMedia[]; total: number; truncated: boolean }> => {
  const cfg = useRuntimeConfig(event)
  const token = String(cfg.instagramToken || '')
  const igUserId = String(cfg.instagramIgUserId || '')

  if (!token) return { items: [], total: 0, truncated: false }

  const { max } = getQuery(event)
  const cap = Math.min(Math.max(Number(max) || 200, 1), 500)

  const isInstagramLoginToken = token.startsWith('IGAA')
  const initialUrl = (!isInstagramLoginToken && igUserId)
    ? `https://graph.facebook.com/v19.0/${igUserId}/media`
      + `?fields=${FIELDS}&limit=${PAGE_SIZE}&access_token=${encodeURIComponent(token)}`
    : `https://graph.instagram.com/me/media`
      + `?fields=${FIELDS}&limit=${PAGE_SIZE}&access_token=${encodeURIComponent(token)}`

  const items: IgMedia[] = []
  let nextUrl: string | undefined = initialUrl
  let truncated = false

  try {
    while (nextUrl && items.length < cap) {
      const res: PagedResponse = await $fetch<PagedResponse>(nextUrl)
      for (const m of (res?.data ?? [])) {
        const imageUrl = m.media_type === 'VIDEO' ? (m.thumbnail_url ?? '') : (m.media_url ?? '')
        if (!imageUrl) continue
        items.push({
          id:        m.id,
          caption:   m.caption ?? '',
          mediaType: m.media_type,
          imageUrl,
          permalink: m.permalink,
          timestamp: m.timestamp,
        })
        if (items.length >= cap) { truncated = !!res.paging?.next; break }
      }
      nextUrl = res?.paging?.next
    }
    return { items, total: items.length, truncated }
  } catch (err: any) {
    console.warn('[instagram/all-posts] Graph API error:', err?.message)
    return { items, total: items.length, truncated: true }
  }
}, {
  maxAge: 60 * 60,
  name:   'instagram-all-posts',
  getKey: (event) => `ig-all-${getQuery(event).max || 200}`,
})
