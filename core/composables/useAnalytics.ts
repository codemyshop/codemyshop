

export const useAnalytics = () => {
  const { $matomo } = useNuxtApp()
  const ph = $matomo as any

  function safe(fn: () => void) {
    try { if (ph) fn() } catch {}
  }

  
  const trackEvent = (event: string, properties?: Record<string, any>) => {
    safe(() => ph.capture(event, properties))
  }

  
  const trackPageView = (url: string) => {
    safe(() => ph.capture('$pageview', { $current_url: url }))
  }

  
  const identifyUser = (userId: string, traits?: Record<string, any>) => {
    safe(() => ph.identify(userId, traits))
  }

  
  const trackSearch = (query: string, resultsCount: number) => {
    safe(() => ph.capture('search', { query, results_count: resultsCount }))
  }

  
  const trackProductView = (productId: string, productName: string) => {
    safe(() => ph.capture('product_viewed', { product_id: productId, product_name: productName }))
  }

  
  const trackAddToCart = (productId: string, price: number) => {
    safe(() => ph.capture('add_to_cart', { product_id: productId, price }))
  }

  
  const trackFunnelStep = (step: string, data?: Record<string, any>) => {
    safe(() => ph.capture('funnel_step', { step, ...data }))
  }

  
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
