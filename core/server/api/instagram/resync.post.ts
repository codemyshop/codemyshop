

export default defineEventHandler(async (event) => {
  const storage = useStorage('cache')

  
  
  let purged = 0
  try {
    const keys = await storage.getKeys('nitro:functions:instagram-feed:')
    for (const k of keys) {
      await storage.removeItem(k)
      purged++
    }
  } catch (err: any) {
    console.warn('[instagram/resync] cache purge error:', err?.message)
  }

  
  let itemsCount = 0
  try {
    const cfg = useRuntimeConfig(event)
    const token = String(cfg.instagramToken || '')
    const igUserId = String(cfg.instagramIgUserId || '')
    if (token) {
      const url = igUserId
        ? `https://graph.facebook.com/v19.0/${igUserId}/media?fields=id&limit=6&access_token=${encodeURIComponent(token)}`
        : `https://graph.instagram.com/me/media?fields=id&limit=6&access_token=${encodeURIComponent(token)}`
      const res = await $fetch<{ data?: any[] }>(url)
      itemsCount = res?.data?.length ?? 0
    }
  } catch (err: any) {
    console.warn('[instagram/resync] refetch error:', err?.message)
  }

  return {
    ok: true,
    purgedKeys: purged,
    refetchedItems: itemsCount,
    at: new Date().toISOString(),
  }
})
