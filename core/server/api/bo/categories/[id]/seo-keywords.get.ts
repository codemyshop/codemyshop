/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /api/bo/categories/[id]/seo-keywords
 *
 * Filters GSC opportunities to keep only those targeting this
 * category, with different logic depending on whether the category is
 * a pillar page or not.
 *
 * Definition (business convention 2026-04-25):
 *   isPillar ⟺ category.id_parent === 2
 *   (id_parent=2 = enfant direct de "Accueil" PrestaShop = niveau 1
 * of the public taxonomy → these are the strategic hubs.)
 *
 * Page pilier :
 * - Loads direct children + tokens of all their descendants.
 * - A keyword that matches descendants of a SINGLE direct child
 * is classified as "silo" under that child.
 * - Remaining keywords (broad / multi-thematic) stay at the
 *     pilier → pillarKeywords + recommendedH1.
 *
 * Page non-pilier (feuille ou mid-tier) :
 * - Direct behavior: any matched keyword stays for this page.
 *
 * Response:
 * {
 *   category: { id, name, slug, level_depth, id_parent },
 *   isPillar: boolean,
 *   children: [{ id, name, slug }, ...],
 *   siteUrl: 'https://example-shop.com/',
 * pillarKeywords: GscOpportunity[],          // broad, stay here
 *   siloKeywords: { childId, child, keywords: GscOpportunity[] }[],
 *   bestKeyword: GscOpportunity | null,
 *   recommendedH1: string | null,
 * }
 */
const PILLAR_PARENT_ID = 2  // PrestaShop "Accueil" — root fonctionnel

import { sql } from 'drizzle-orm'
import { usePocPg } from '~/server/db/drizzle-pg'
import { resolveClientId } from '~/server/utils/db'
import { getTopOpportunities, type GscOpportunity } from '~/server/services/gsc'
import { getClientConfigJson } from '~/internal/clientconfig/server/utils/clientconfig'

function normalize(s: string): string {
  return s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function tokenize(s: string): string[] {
  return normalize(s).split('-').filter(t => t.length >= 3)
}

async function resolveTenantSiteUrl(event: any): Promise<string> {
  try {
    const clientId = resolveClientId(event)
    const json = await getClientConfigJson(clientId, { event })
    if (!json) return ''
    const config = JSON.parse(json)
    return typeof config?.gscSiteUrl === 'string' ? config.gscSiteUrl : ''
  } catch {
    return ''
  }
}

interface CategoryNode {
  id: number
  id_parent: number
  name: string
  slug: string
  level_depth: number
  nleft: number
  nright: number
}

interface DescendantEntry {
  name: string         // normalisé
  slug: string         // normalisé
  level_depth: number  // profondeur PS (root=0, "Accueil"=1, pilier=2, …)
}

interface DescendantToken {
  childId: number       // ID du child de niveau +1 (= "silo bucket")
  childName: string
  childSlug: string
  childDepth: number    // profondeur du child de niveau +1 lui-même
  descendants: DescendantEntry[]
}

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id || Number.isNaN(id)) {
    throw createError({ statusCode: 400, message: 'Invalid category id' })
  }

  const d = usePocPg()

  // Langue par défaut du shop (utilisée pour tous les SELECT _lang).
  const defaultLangResult: any = await d.execute(sql`
    SELECT value AS "id_lang" FROM cs_main.ps_configuration WHERE name = 'PS_LANG_DEFAULT' LIMIT 1
  `)
  const defaultLangRow = ((defaultLangResult as any) as any[])[0]
  const idLang = Number(defaultLangRow?.id_lang) || 1

  // 1. Charger la catégorie courante (avec id_parent + nleft/nright/level_depth)
  const catResult: any = await d.execute(sql`
    SELECT c.id_category AS "id", c.id_parent, cl.name, cl.link_rewrite AS "slug",
           c.level_depth, c.nleft, c.nright
    FROM cs_main.ps_category c
    JOIN cs_main.ps_category_lang cl ON cl.id_category = c.id_category AND cl.id_lang = ${idLang}
    WHERE c.id_category = ${id}
    LIMIT 1
  `)
  const cat = ((catResult as any) as any[])[0] as CategoryNode | undefined

  if (!cat) {
    throw createError({ statusCode: 404, message: 'Category not found' })
  }

  // 2. Définition pilier : id_parent === 2 (= enfant direct de "Accueil" PS)
  const isPillar = cat.id_parent === PILLAR_PARENT_ID

  // 2bis. Si non-pilier, remonter la chaîne id_parent jusqu'au premier
  // ancêtre dont id_parent === 2 → c'est la pilier sous laquelle vit
  // cette catégorie. Sert au "lien remontant" dans le §1 du résumé.
  let pillarAncestor: { id: number; name: string; slug: string } | null = null
  let pillarAncestorId: number | null = null
  if (!isPillar) {
    let currentParentId = cat.id_parent
    let depth = 0
    while (currentParentId > 2 && depth < 10) {
      const ancestorResult: any = await d.execute(sql`
        SELECT c.id_category AS "id", c.id_parent, cl.name, cl.link_rewrite AS "slug",
               c.level_depth, c.nleft, c.nright
        FROM cs_main.ps_category c
        JOIN cs_main.ps_category_lang cl ON cl.id_category = c.id_category AND cl.id_lang = ${idLang}
        WHERE c.id_category = ${currentParentId}
        LIMIT 1
      `)
      const ancestor = ((ancestorResult as any) as any[])[0] as CategoryNode | undefined
      if (!ancestor) break
      if (ancestor.id_parent === PILLAR_PARENT_ID) {
        pillarAncestor = { id: ancestor.id, name: ancestor.name, slug: ancestor.slug }
        pillarAncestorId = ancestor.id
        break
      }
      currentParentId = ancestor.id_parent
      depth++
    }
  }

  // 2ter. Sous-catégories sœurs : enfants directs de la pilier ancêtre,
  // hors la cat courante. Sert à enrichir le maillage interne dans la
  // description longue (cross-link entre pages feuilles d'un même silo).
  let siblings: { id: number; name: string; slug: string }[] = []
  if (pillarAncestorId) {
    const sibResult: any = await d.execute(sql`
      SELECT c.id_category AS "id", c.id_parent, cl.name, cl.link_rewrite AS "slug",
             c.level_depth, c.nleft, c.nright
      FROM cs_main.ps_category c
      JOIN cs_main.ps_category_lang cl ON cl.id_category = c.id_category AND cl.id_lang = ${idLang}
      WHERE c.id_parent = ${pillarAncestorId} AND c.active = 1 AND c.id_category != ${id}
      ORDER BY c.position
      LIMIT 30
    `)
    const sibRows = (((sibResult as any) as any[]) ?? []) as CategoryNode[]
    siblings = sibRows.map((s) => ({ id: s.id, name: s.name, slug: s.slug }))
  }

  // 3. Charger les enfants directs — sert au siloing si pilier
  const childrenResult: any = await d.execute(sql`
    SELECT c.id_category AS "id", c.id_parent, cl.name, cl.link_rewrite AS "slug",
           c.level_depth, c.nleft, c.nright
    FROM cs_main.ps_category c
    JOIN cs_main.ps_category_lang cl ON cl.id_category = c.id_category AND cl.id_lang = ${idLang}
    WHERE c.id_parent = ${id} AND c.active = 1
    ORDER BY c.position
  `)
  const children = (((childrenResult as any) as any[]) ?? []) as CategoryNode[]

  // 3. Pour chaque enfant direct, collecter les noms/slugs/profondeurs de
  //    tous ses descendants (langue par défaut). Sert à scorer + tie-break
  //    par "shallow first" sur les keywords GSC.
  const descendantTokens: DescendantToken[] = []
  if (isPillar) {
    for (const child of children) {
      const descResult: any = await d.execute(sql`
        SELECT cl.name, cl.link_rewrite AS "slug", c.level_depth
        FROM cs_main.ps_category c
        JOIN cs_main.ps_category_lang cl ON cl.id_category = c.id_category AND cl.id_lang = ${idLang}
        WHERE c.nleft >= ${child.nleft} AND c.nright <= ${child.nright} AND c.active = 1
      `)
      const descendants = (((descResult as any) as any[]) ?? []) as Array<{ name: string; slug: string; level_depth: number }>
      descendantTokens.push({
        childId: child.id,
        childName: child.name,
        childSlug: child.slug,
        childDepth: child.level_depth,
        descendants: descendants
          .map(d => ({ name: normalize(d.name), slug: normalize(d.slug), level_depth: d.level_depth }))
          .filter(d => d.name || d.slug),
      })
    }
  }

  // 4. Tirer les opportunités GSC pour le tenant
  const siteUrl = await resolveTenantSiteUrl(event)
  if (!siteUrl) {
    return {
      category: { id: cat.id, id_parent: cat.id_parent, name: cat.name, slug: cat.slug, level_depth: cat.level_depth },
      isPillar,
      children: children.map(c => ({ id: c.id, name: c.name, slug: c.slug })),
      siteUrl: '',
      pillarKeywords: [],
      siloKeywords: [],
      bestKeyword: null,
      recommendedH1: null,
      error: 'gscSiteUrl non configuré pour ce tenant',
    }
  }

  const allOpps = await getTopOpportunities(siteUrl, 28, 100)

  // 5. Premier filtre : keywords matchés à la catégorie courante
  //    (URL contient le slug, OU keyword/page contient un token de la catégorie)
  const slugNorm = normalize(cat.slug)
  const nameTokens = tokenize(cat.name)
  const slugTokens = tokenize(cat.slug)
  const catTokens = [...new Set([...nameTokens, ...slugTokens])]

  type EnrichedOpp = GscOpportunity & {
    matchScore: number
    matchReason: string
    siloChild?: { id: number; name: string; slug: string }
  }

  const matched: EnrichedOpp[] = []

  for (const opp of allOpps) {
    const kw = normalize(opp.query)
    const page = normalize(opp.page)
    let matchScore = 0
    const reasons: string[] = []

    if (slugNorm && page.includes(slugNorm)) {
      matchScore += 100
      reasons.push('URL match')
    }
    if (slugNorm && kw.includes(slugNorm)) {
      matchScore += 50
      reasons.push('keyword exact')
    }
    const tokenHits = catTokens.filter(t => kw.includes(t)).length
    if (tokenHits > 0) {
      matchScore += tokenHits * 20
      reasons.push(`${tokenHits} token${tokenHits > 1 ? 's' : ''}`)
    }

    if (matchScore > 0) {
      matched.push({ ...opp, matchScore, matchReason: reasons.join(', ') })
    }
  }

  // 6. Si pilier : classer chaque keyword matché en pillar OU silo
  let pillarKeywords: EnrichedOpp[] = matched
  const siloMap = new Map<number, { child: CategoryNode; keywords: EnrichedOpp[] }>()

  if (isPillar) {
    pillarKeywords = []
    // Tokens "génériques" à ignorer dans le scoring (= tokens du nom de la pilier).
    const pillarTokenSet = new Set([...tokenize(cat.name), ...tokenize(cat.slug)])

    interface ChildScore {
      score: number       // somme pondérée (exact +100 / partiel-name +30 / partiel-slug +20)
      hits: number        // nb de tokens distincts du keyword qui ont matché
      minDepth: number    // profondeur du descendant le plus shallow ayant matché (Infinity si aucun)
    }

    for (const opp of matched) {
      const kwTokens = tokenize(opp.query).filter(t => !pillarTokenSet.has(t))

      const scoreByChild = new Map<number, ChildScore>()
      for (const dt of descendantTokens) {
        let score = 0
        let hits = 0
        let minDepth = Infinity

        for (const t of kwTokens) {
          let tokenHit = false
          let tokenBestDepth = Infinity

          // Pass 1 : exact match du nom d'un descendant (le plus fort)
          for (const d of dt.descendants) {
            if (d.name === t) {
              tokenHit = true
              if (d.level_depth < tokenBestDepth) tokenBestDepth = d.level_depth
            }
          }
          if (tokenHit) {
            score += 100
            hits += 1
            if (tokenBestDepth < minDepth) minDepth = tokenBestDepth
            continue
          }

          // Pass 2 : nom partiel
          for (const d of dt.descendants) {
            if (d.name && d.name.includes(t)) {
              tokenHit = true
              if (d.level_depth < tokenBestDepth) tokenBestDepth = d.level_depth
            }
          }
          if (tokenHit) {
            score += 30
            hits += 1
            if (tokenBestDepth < minDepth) minDepth = tokenBestDepth
            continue
          }

          // Pass 3 : slug partiel
          for (const d of dt.descendants) {
            if (d.slug && d.slug.includes(t)) {
              tokenHit = true
              if (d.level_depth < tokenBestDepth) tokenBestDepth = d.level_depth
            }
          }
          if (tokenHit) {
            score += 20
            hits += 1
            if (tokenBestDepth < minDepth) minDepth = tokenBestDepth
          }
        }

        if (score > 0) scoreByChild.set(dt.childId, { score, hits, minDepth })
      }

      if (scoreByChild.size === 0) {
        pillarKeywords.push(opp)
        continue
      }

      // Tri : (score desc, hits desc, minDepth asc). Le 1er strict gagne.
      const ranking = [...scoreByChild.entries()].sort((a, b) => {
        if (b[1].score !== a[1].score) return b[1].score - a[1].score
        if (b[1].hits !== a[1].hits)   return b[1].hits  - a[1].hits
        return a[1].minDepth - b[1].minDepth   // shallow first
      })

      const winner = ranking[0]
      const runnerUp = ranking[1]
      const isStrictWin =
        !runnerUp ||
        winner[1].score > runnerUp[1].score ||
        winner[1].hits  > runnerUp[1].hits  ||
        winner[1].minDepth < runnerUp[1].minDepth

      if (!isStrictWin) {
        // Vraie égalité parfaite sur les 3 critères → keyword broad
        pillarKeywords.push(opp)
      } else {
        const childId = winner[0]
        const child = children.find(c => c.id === childId)!
        if (!siloMap.has(childId)) {
          siloMap.set(childId, { child, keywords: [] })
        }
        siloMap.get(childId)!.keywords.push({
          ...opp,
          siloChild: { id: child.id, name: child.name, slug: child.slug },
        })
      }
    }
  }

  // Tri pillar par score combiné
  pillarKeywords.sort((a, b) => b.matchScore - a.matchScore || b.score - a.score)
  pillarKeywords = pillarKeywords.slice(0, 15)

  const siloKeywords = [...siloMap.values()]
    .map(({ child, keywords }) => ({
      childId: child.id,
      child: { id: child.id, name: child.name, slug: child.slug },
      keywords: keywords.sort((a, b) => b.score - a.score).slice(0, 5),
    }))
    .sort((a, b) => b.keywords.length - a.keywords.length)

  const best = pillarKeywords[0] ?? null
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  const recommendedH1 = best ? cap(best.query) : null

  return {
    category: { id: cat.id, id_parent: cat.id_parent, name: cat.name, slug: cat.slug, level_depth: cat.level_depth },
    isPillar,
    pillarAncestor,
    siblings,
    children: children.map(c => ({ id: c.id, name: c.name, slug: c.slug })),
    siteUrl,
    pillarKeywords,
    siloKeywords,
    bestKeyword: best,
    recommendedH1,
  }
})
