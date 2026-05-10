/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * 301 SEO redirects — old blog slugs to new.
 * Added on 2026-03-24 after URL optimization.
 */

const SLUG_REDIRECTS: Record<string, string> = {
  // 2026-03-24 — Nettoyage stop words, doublons catégorie, longueur
  'ocean-bleu-ecommerce-sortir-guerre-des-prix': 'ocean-bleu-ecommerce-guerre-prix',
  'gatekeepers-ecommerce-liberez-votre-business': 'gatekeepers-ecommerce-liberation',
  'ia-entreprise-france-retard-usa-opportunite': 'ia-france-retard-opportunite',
  'pipeline-seo-automatise-methode-resultats': 'pipeline-automatise-resultats',
  'core-web-vitals-prestashop-pagespeed-90': 'core-web-vitals-pagespeed-90',
  'docker-prestashop-vps-deployer-production': 'docker-vps-deploy-production',
  'docker-prestashop-headless-multi-conteneurs': 'docker-headless-multi-conteneurs',
  'ecommerce-2026-boutique-media-flywheel': 'ecommerce-2026-boutique-media',
  'headless-vs-shopify-hub-developpeur': 'headless-vs-shopify-comparatif',
  'content-intelligence-ia-decide-quoi-publier': 'content-intelligence-ia-publication',
  'solo-unicorn-sam-altman-course-2026': 'solo-unicorn-sam-altman-2026',
  // 2026-04-04 — URLs fantômes crawlées par GPTBot
  'synedre-ia-souverain-pme': 'le-synedre-orchestration-multi-agents-ia',
}

// Redirections pages entières (ancienne URL → nouvelle)
const PAGE_REDIRECTS: Record<string, string> = {
  '/offre-ecommerce-ia': '/offre-starter',
}

// Academy — slugs partiels vers slugs complets
const ACADEMY_REDIRECTS: Record<string, string> = {
  'web-vivant': 'le-web-vivant',
  'build-in-public': 'build-in-public-construire-sa-cathedrale-les-portes-ouvertes',
  'ia-cequipier-ecommerce': '',  // supprimé → /academy
}

// API endpoints supprimés (migration JSON→DB)
// Note 2026-04-07 : /api/footer RÉACTIVÉ — règle DB-first stricte (cf
// feedback_everything_ac_module_db.md). Le footer est maintenant servi
// depuis cs_footer (DB), plus depuis le config statique.
const REMOVED_API_REDIRECTS: Record<string, number> = {
}

export default defineEventHandler((event) => {
  const url = getRequestURL(event)
  const path = url.pathname

  // Redirections pages entières
  if (PAGE_REDIRECTS[path]) {
    return sendRedirect(event, PAGE_REDIRECTS[path], 301)
  }

  // API endpoints supprimés → 410 Gone
  if (REMOVED_API_REDIRECTS[path]) {
    throw createError({ statusCode: REMOVED_API_REDIRECTS[path], message: 'Endpoint supprimé' })
  }

  // Academy — redirect slugs partiels
  if (path.startsWith('/academy/')) {
    const segments = path.split('/')
    const moduleSlug = segments[2]
    if (moduleSlug && ACADEMY_REDIRECTS[moduleSlug] !== undefined) {
      const target = ACADEMY_REDIRECTS[moduleSlug]
      if (target) {
        // Reconstruire le path avec le bon slug (préserver la leçon si présente)
        segments[2] = target
        return sendRedirect(event, segments.join('/'), 301)
      }
      // Slug supprimé → redirect vers /academy
      return sendRedirect(event, '/academy', 301)
    }
  }

  // Blog — redirect anciens slugs
  if (!path.startsWith('/blog/')) return

  const segments = path.split('/')
  const lastSegment = segments[segments.length - 1]

  if (lastSegment && SLUG_REDIRECTS[lastSegment]) {
    segments[segments.length - 1] = SLUG_REDIRECTS[lastSegment]
    const newPath = segments.join('/')
    return sendRedirect(event, newPath, 301)
  }
})
