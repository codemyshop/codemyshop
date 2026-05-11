

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
  maxAge: 60 * 60,       
  name:   'instagram-feed',
  getKey: (event) => `ig-${getQuery(event).limit || 6}`,
})
