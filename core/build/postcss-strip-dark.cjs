/**
 * postcss-strip-dark
 *
 * Supprime les règles CSS dont au moins un selecteur cible le mode sombre
 * (classe `.dark` ou `html.dark`). Activé pour les tenants light-only afin
 * d'éviter de servir ~46KB de CSS inerte sur chaque pageview.
 *
 * Cibles supprimées :
 *   .dark .dark\:bg-slate-800 { ... }   (Tailwind dark variant, darkMode:'class')
 *   html.dark { --color-background: ... }  (overrides tenant-agnostiques)
 *   html.dark .bg-white { ... }
 *
 * Préservé :
 *   .dark-blue { ... }    (composant nommé)
 *   [data-theme=dark] { ... }
 *
 * Pour selecteurs multiples (`.foo, .dark .x, .bar`), seules les portions
 * dark sont retirées ; la règle survit avec les autres selecteurs.
 *
 * Tenants light-only opt-in via runtimeConfig (cf clients/<t>/nuxt.config.ts).
 */

const DARK_TOKEN = /\.dark(?=[\s,\.\#:\[\\]|$)/

function selectorIsDark(sel) {
  return DARK_TOKEN.test(sel)
}

module.exports = () => ({
  postcssPlugin: 'postcss-strip-dark',
  Once(root) {
    let droppedRules = 0
    let droppedBytes = 0

    root.walkRules((rule) => {
      const before = rule.toString().length
      const sels = rule.selectors
      const kept = sels.filter((s) => !selectorIsDark(s))

      if (kept.length === 0) {
        droppedRules++
        droppedBytes += before
        rule.remove()
      } else if (kept.length !== sels.length) {
        rule.selectors = kept
      }
    })

    if (process.env.STRIP_DARK_VERBOSE === 'true') {
      // eslint-disable-next-line no-console
      console.log(`[postcss-strip-dark] dropped ${droppedRules} rules (~${(droppedBytes/1024).toFixed(1)} KB)`)
    }
  },
})

module.exports.postcss = true
