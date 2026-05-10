/**
 *
 * Plugin Matomo (client-side uniquement)
 * Direct injection of native Matomo tracker (matomo.js + _paq.push).
 * Respects GDPR: disabled if navigator.doNotTrack === '1'.
 * Automatic tracking of route changes (SPA).
 */
// KILL-SWITCH 2026-05-04 — backlog #264 : ac_mariadb droppé 2026-04-30,
// Matomo throw 400 sur tous les hits tracker (host = "ac_mariadb" mort,
// SQLSTATE[2002] getaddrinfo failed). On désactive l'injection tant que
// l'infra n'est pas restaurée (option 1 = container matomo_mariadb dédié,
// option 2 = migration Plausible/Umami). Retirer cette constante quand
// Matomo répond 200 à nouveau pour réactiver le tracking.
const MATOMO_DISABLED = true

export default defineNuxtPlugin(() => {
  if (MATOMO_DISABLED) return

  const config = useRuntimeConfig()
  const matomoUrl = (config.public.matomoUrl as string) || ''
  const siteId = (config.public.matomoSiteId as string) || ''

  // Pas de config = pas d'analytics
  if (!matomoUrl || !siteId) return

  // Respect RGPD
  if (typeof navigator !== 'undefined' && navigator.doNotTrack === '1') return

  // Init _paq
  const _paq = (window as any)._paq = (window as any)._paq || []
  _paq.push(['disableCookies'])
  _paq.push(['trackPageView'])
  _paq.push(['enableLinkTracking'])
  _paq.push(['setTrackerUrl', `${matomoUrl}/matomo.php`])
  _paq.push(['setSiteId', siteId])

  // Inject matomo.js — strategy onNuxtReady (après LCP, ne bloque pas le TBT)
  useScript(
    { src: `${matomoUrl}/matomo.js`, async: true },
    { trigger: 'onNuxtReady' },
  )

  // Track SPA route changes
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
