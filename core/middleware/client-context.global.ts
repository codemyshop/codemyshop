/**
 * Middleware global — Contexte client sticky (preview mode)
 *
 * Logique :
 * ?preview=example-shop  → writes the ac_preview cookie (TTL 24h), maintains the theme
 * across all following pages without repeating the parameter
 * ?preview=         → clears the cookie (returns to the main site)
 * (nothing)            → existing cookie read by useClientDetection, theme preserved
 */
export default defineNuxtRouteMiddleware((to) => {
  const previewCookie = useCookie<string | null>('ac_preview', {
    maxAge:   86_400,   // 24 h
    path:     '/',
    sameSite: 'lax',
  })

  const queryPreview = to.query.preview as string | undefined

  if (queryPreview !== undefined) {
    // Paramètre explicite → mise à jour (ou effacement si vide)
    previewCookie.value = queryPreview || null
  }
  // Sinon : pas de modification → le cookie existant persiste
})
