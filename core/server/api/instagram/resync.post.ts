/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * POST /api/instagram/resync
 *
 * Invalidates the Nitro cache for /api/instagram/feed and forces an immediate re-fetch.
 * Used by the "Re-sync" button in the homepage builder.
 */

export default defineEventHandler(async (event) => {
  const storage = useStorage('cache')

  // Purge toutes les entrées cachées par defineCachedEventHandler de instagram-feed
  // Nitro stocke sous : nitro:functions:instagram-feed:{key}.json
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

  // Force un refetch immédiat (populate le cache avec frais)
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
