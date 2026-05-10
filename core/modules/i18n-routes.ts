/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * Module Nuxt — i18n Routes (prefix strategy + localized root segments).
 *
 * For each existing .vue page:
 * 1. Duplicate with /:lang(en|de|…) prefix → /en/grossiste/:path*
 * 2. If the first path segment is a canonical root (e.g., grossiste,
 *      marque, produit, blog, recherche, contact, catalogue, page),
 * duplicate with its translations per ISO (/en/wholesaler/:path*,
 *      /de/grosshandel/:path*, …).
 *
 * The .vue component is IDENTICAL for all variants — only the
 * entry path changes. useRouteLang() reads route.params.lang.
 *
 * Why not a server middleware URL-rewrite: H3 v1.15 captures _reqPath
 * as const BEFORE middlewares — the rewrite is overwritten at each
 * iteration of the layers loop (see createAppEventHandler).
 */
import { defineNuxtModule, extendPages } from '@nuxt/kit'
import { ALL_POSSIBLE_LOCALES, ROOT_CANONICAL_FR, ROOT_TRANSLATIONS } from '../utils/locale-route-roots'

export default defineNuxtModule<{ locales?: string[] }>({
  meta: { name: 'i18n-routes', configKey: 'i18nRoutes' },
  defaults: {},

  setup(options, nuxt) {
    // Priorité : option module → runtimeConfig.public.i18nLocales → env → ['en']
    const fromRc = (nuxt.options.runtimeConfig.public as any)?.i18nLocales as string[] | undefined
    const fromEnv = (process.env.NUXT_I18N_LOCALES || '')
      .split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
    const raw = (options.locales && options.locales.length ? options.locales
                : fromRc && fromRc.length ? fromRc
                : fromEnv.length ? fromEnv
                : ['en'])
    const I18N_LOCALES = raw.filter(l => ALL_POSSIBLE_LOCALES.includes(l))
    // Propage vers runtimeConfig.public pour que les composables (useI18nHead,
    // useLocalePath) lisent la même source.
    ;(nuxt.options.runtimeConfig.public as any).i18nLocales = I18N_LOCALES

    const localeRe = I18N_LOCALES.join('|')

    extendPages((pages) => {
      const i18nPages: typeof pages = []

      for (const page of pages) {
        // 1. Variante générique /:lang(en|de|…)/<path original>
        const genericPath = page.path === '/'
          ? `/:lang(${localeRe})`
          : `/:lang(${localeRe})${page.path}`

        i18nPages.push({
          ...page,
          path: genericPath,
          name: page.name ? `${String(page.name)}___i18n` : undefined,
          children: page.children ? page.children.map(c => ({ ...c })) : undefined,
        })

        // 2. Variantes root-localisées : si le premier segment est un canonical FR
        //    connu, créer des alias pour chaque iso qui le traduit différemment.
        //    Ex : page.path = '/grossiste/:path(.*)*' →
        //         /:lang(en)/wholesaler/:path(.*)*
        //         /:lang(de)/grosshandel/:path(.*)*
        //         …
        if (!page.path || page.path === '/') continue
        const match = page.path.match(/^\/([a-z-]+)(\/.*)?$/)
        if (!match) continue
        const firstSeg = match[1]
        const rest = match[2] || ''
        if (!ROOT_CANONICAL_FR.has(firstSeg)) continue

        // Pour chaque locale qui a une traduction DIFFÉRENTE du canonical FR
        const aliasesByLocale: Record<string, string> = {}
        for (const iso of I18N_LOCALES) {
          const loc = ROOT_TRANSLATIONS[iso]?.[firstSeg]
          if (loc && loc !== firstSeg) aliasesByLocale[iso] = loc
        }
        // Grouper par segment localisé → 1 route par groupe (plusieurs locales
        // peuvent partager le même slug, ex: 'contact' EN + FR + DE).
        const bySlug: Record<string, string[]> = {}
        for (const [iso, slug] of Object.entries(aliasesByLocale)) {
          if (!bySlug[slug]) bySlug[slug] = []
          bySlug[slug].push(iso)
        }
        for (const [localizedSlug, isos] of Object.entries(bySlug)) {
          const aliasPath = `/:lang(${isos.join('|')})/${localizedSlug}${rest}`
          i18nPages.push({
            ...page,
            path: aliasPath,
            name: page.name ? `${String(page.name)}___i18n_${localizedSlug}` : undefined,
            children: page.children ? page.children.map(c => ({ ...c })) : undefined,
          })
        }
      }

      pages.push(...i18nPages)
    })
  },
})
