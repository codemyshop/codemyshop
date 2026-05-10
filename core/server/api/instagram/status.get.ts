/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /api/instagram/status
 *
 * Returns the Instagram connection status: account connected, date
 * of token expiration, days remaining. Used by the homepage builder
 * to display the expiration reminder and the re-sync button.
 */

interface DebugTokenResponse {
  data?: {
    app_id?:        string
    user_id?:       string
    is_valid?:      boolean
    expires_at?:    number
    data_access_expires_at?: number
    granular_scopes?: any[]
    scopes?:        string[]
  }
}

export default defineEventHandler(async (event) => {
  const cfg = useRuntimeConfig(event)
  const token = String(cfg.instagramToken || '')

  if (!token) {
    return {
      connected: false,
      username: null,
      userId: null,
      expiresAt: null,
      daysRemaining: null,
      reason: 'Aucun token configuré (NUXT_INSTAGRAM_TOKEN)',
    }
  }

  try {
    // /me pour obtenir le username (endpoint Instagram Login)
    const meRes = await $fetch<{ id?: string; username?: string }>(
      `https://graph.instagram.com/me?fields=id,username&access_token=${encodeURIComponent(token)}`,
    )

    // debug_token pour l'expiration — nécessite APP_ID + APP_SECRET (app access token)
    // Format : access_token={app-id}|{app-secret}
    let expiresAt: number | null = null
    let daysRemaining: number | null = null

    // ST_INSTAGRAM_TOKEN_TIME était le mode employé par stinstagram (stockage local).
    // Côté Nuxt on interroge directement debug_token si les creds app sont dispo.
    const appId = process.env.EXAMPLE_INSTAGRAM_APP_ID || process.env.INSTAGRAM_APP_ID
    const appSecret = process.env.EXAMPLE_INSTAGRAM_APP_SECRET || process.env.INSTAGRAM_APP_SECRET

    if (appId && appSecret) {
      try {
        const debugRes = await $fetch<DebugTokenResponse>(
          `https://graph.facebook.com/debug_token?input_token=${encodeURIComponent(token)}&access_token=${encodeURIComponent(`${appId}|${appSecret}`)}`,
        )
        if (debugRes?.data?.expires_at) {
          expiresAt = debugRes.data.expires_at
          daysRemaining = Math.round((expiresAt * 1000 - Date.now()) / 86400000)
        }
      } catch { /* debug_token optionnel */ }
    }

    // Fallback : expiration explicite en env (date ISO YYYY-MM-DD ou timestamp UNIX).
    // Useful when the token comes from a different Meta app and debug_token does not match
    // the local credentials (when the token comes from the Instagram integration module in production).
    if (!expiresAt && process.env.NUXT_INSTAGRAM_TOKEN_EXPIRES_AT) {
      const raw = String(process.env.NUXT_INSTAGRAM_TOKEN_EXPIRES_AT).trim()
      const asNum = Number(raw)
      const parsed = Number.isFinite(asNum) && asNum > 0
        ? asNum
        : Math.floor(new Date(raw).getTime() / 1000)
      if (Number.isFinite(parsed) && parsed > 0) {
        expiresAt = parsed
        daysRemaining = Math.round((parsed * 1000 - Date.now()) / 86400000)
      }
    }

    return {
      connected: true,
      username: meRes?.username ?? null,
      userId: meRes?.id ?? null,
      expiresAt,
      daysRemaining,
      reason: null,
    }
  } catch (err: any) {
    return {
      connected: false,
      username: null,
      userId: null,
      expiresAt: null,
      daysRemaining: null,
      reason: `Token invalide ou expiré : ${err?.message || 'erreur inconnue'}`,
    }
  }
})
