/**
 *
 * Wrapper souverain autour de Matomo self-hosted.
 * All calls are non-blocking (try/catch).
 * If Matomo is not initialized, calls are silently ignored.
 */

export const useAnalytics = () => {
  const { $matomo } = useNuxtApp()
  const ph = $matomo as any

  function safe(fn: () => void) {
    try { if (ph) fn() } catch {}
  }

  /** Événement custom */
  const trackEvent = (event: string, properties?: Record<string, any>) => {
    safe(() => ph.capture(event, properties))
  }

  /** Page view (if autocapture disabled) */
  const trackPageView = (url: string) => {
    safe(() => ph.capture('$pageview', { $current_url: url }))
  }

  /** Identify a user (login) */
  const identifyUser = (userId: string, traits?: Record<string, any>) => {
    safe(() => ph.identify(userId, traits))
  }

  /** Recherche interne */
  const trackSearch = (query: string, resultsCount: number) => {
    safe(() => ph.capture('search', { query, results_count: resultsCount }))
  }

  /** Vue produit */
  const trackProductView = (productId: string, productName: string) => {
    safe(() => ph.capture('product_viewed', { product_id: productId, product_name: productName }))
  }

  /** Ajout panier */
  const trackAddToCart = (productId: string, price: number) => {
    safe(() => ph.capture('add_to_cart', { product_id: productId, price }))
  }

  /** Conversion funnel step */
  const trackFunnelStep = (step: string, data?: Record<string, any>) => {
    safe(() => ph.capture('funnel_step', { step, ...data }))
  }

  /** Reset (logout) */
  const reset = () => {
    safe(() => ph.reset())
  }

  return {
    trackEvent,
    trackPageView,
    identifyUser,
    trackSearch,
    trackProductView,
    trackAddToCart,
    trackFunnelStep,
    reset,
  }
}
