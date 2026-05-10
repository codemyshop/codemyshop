/**
 *
 * Client-side middleware: checks license status.
 * Redirects to /suspended if license is expired (API 403).
 */

export default defineNuxtRouteMiddleware(async (to) => {
  // Ne vérifier que les pages Hub
  if (!to.path.startsWith('/hub')) return

  // Ne pas boucler sur /suspended
  if (to.path === '/suspended') return

  try {
    await $fetch('/api/hub/system-status', { timeout: 5000 })
  } catch (err: any) {
    if (err?.statusCode === 403) {
      return navigateTo('/suspended')
    }
    // Autres erreurs (réseau, etc.) → laisser passer
  }
})
