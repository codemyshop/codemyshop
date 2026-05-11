

const MATOMO_DISABLED = true

export default defineNuxtPlugin(() => {
  if (MATOMO_DISABLED) return

  const config = useRuntimeConfig()
  const matomoUrl = (config.public.matomoUrl as string) || ''
  const siteId = (config.public.matomoSiteId as string) || ''

  
  if (!matomoUrl || !siteId) return

  
  if (typeof navigator !== 'undefined' && navigator.doNotTrack === '1') return

  
  const _paq = (window as any)._paq = (window as any)._paq || []
  _paq.push(['disableCookies'])
  _paq.push(['trackPageView'])
  _paq.push(['enableLinkTracking'])
  _paq.push(['setTrackerUrl', `${matomoUrl}/matomo.php`])
  _paq.push(['setSiteId', siteId])

  
  useScript(
    { src: `${matomoUrl}/matomo.js`, async: true },
    { trigger: 'onNuxtReady' },
  )

  
  const router = useRouter()
  router.afterEach((to) => {
    const _paq = (window as any)._paq
    if (_paq) {
      _paq.push(['setCustomUrl', to.fullPath])
      _paq.push(['setDocumentTitle', document.title])
      _paq.push(['trackPageView'])
    }
  })
})
