/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /api/instagram/feed?limit=6
 *
 * Fetches the N most recent Instagram posts via the Meta API (2 flows supported):
 *
 * 1. Instagram Login API (recent flow — tokens starting with IGAA...)
 *     URL : graph.instagram.com/me/media
 * Requires: instagramToken only (no IG user ID)
 * This is the flow used by the Instagram integration module in production.
 *
 * 2. Meta Business / Page Access Token (flow via linked Facebook Page)
 *     URL : graph.facebook.com/v19.0/{ig-user-id}/media
 *     Requiert : instagramToken + instagramIgUserId
 *
 * Auto-detection: if an IG user ID is provided → Business flow. Otherwise → Instagram Login.
 * Silent fallback {items:[]} if token is absent or expired → the component falls back
 * to its static CTA.
 *
 * Cache : 1h via defineCachedEventHandler (rate-limit Graph API ~200/h).
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

const FIELDS = 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp'

export default defineCachedEventHandler(async (event): Promise<{ items: IgMedia[] }> => {
  const cfg = useRuntimeConfig(event)
  const token = String(cfg.instagramToken || '')
  const igUserId = String(cfg.instagramIgUserId || '')

  if (!token) {
    return { items: [] }
  }

  const { limit } = getQuery(event)
  const n = Math.min(Math.max(Number(limit) || 6, 1), 12)

  // Auto-détection du flow : le préfixe IGAA... signe un token Instagram Login
  // (flow récent, me/media) — ignorer un éventuel IG user ID dans ce cas.
  // Sinon, si IG user ID fourni, flow Meta Business Page ({user-id}/media).
  const isInstagramLoginToken = token.startsWith('IGAA')
  const url = (!isInstagramLoginToken && igUserId)
    ? `https://graph.facebook.com/v19.0/${igUserId}/media`
      + `?fields=${FIELDS}&limit=${n}&access_token=${encodeURIComponent(token)}`
    : `https://graph.instagram.com/me/media`
      + `?fields=${FIELDS}&limit=${n}&access_token=${encodeURIComponent(token)}`

  try {
    const res = await $fetch<{ data?: IgMediaRaw[] }>(url)
    const items: IgMedia[] = (res?.data ?? []).map(m => ({
      id:        m.id,
      caption:   m.caption ?? '',
      mediaType: m.media_type,
      imageUrl:  m.media_type === 'VIDEO' ? (m.thumbnail_url ?? '') : (m.media_url ?? ''),
      permalink: m.permalink,
      timestamp: m.timestamp,
    })).filter(m => m.imageUrl)

    return { items }
  } catch (err: any) {
    console.warn('[instagram/feed] Graph API error:', err?.message)
    return { items: [] }
  }
}, {
  maxAge: 60 * 60,       // 1h
  name:   'instagram-feed',
  getKey: (event) => `ig-${getQuery(event).limit || 6}`,
})
