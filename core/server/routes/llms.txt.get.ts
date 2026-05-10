/**
 *
 * GET /llms.txt
 * The AI robots.txt — indicates to LLMs (ChatGPT, Perplexity, Claude)
 * who we are, what we do, and what content to index.
 * Emerging standard: https://llmstxt.org
 *
 * Direct Drizzle DB (policy of no external webservice calls, 2026-04-22):
 * counts agents + articles from CMS read via direct SELECT, no more webservice proxy
 * de $fetch /api/content_management_system.
 */
import { sql } from 'drizzle-orm'
import { usePocPg } from '~/server/db/drizzle-pg'

function first<T = any>(result: any): T | null {
  return (result?.[0] as T) ?? null
}

export default defineEventHandler(async (event) => {
  const host = getRequestHost(event) || ''
  const isAC = !host.includes('codemyshop')
  const baseUrl = isAC ? 'https://codemyshop.com' : 'https://codemyshop.com'

  const d = usePocPg()

  let agentCount = 23
  try {
    const r = await d.execute(sql`SELECT COUNT(*)::int AS "n" FROM cs_main.cs_agents WHERE active = 1`)
      .then(first<{ n: number | string }>)
    if (r?.n != null) agentCount = Number(r.n) || agentCount
  } catch { /* fallback */ }

  let articleCount = 29
  try {
    const r = await d.execute(sql`SELECT COUNT(*)::int AS "n" FROM cs_main.ps_cms WHERE active = 1`)
      .then(first<{ n: number | string }>)
    if (r?.n != null) articleCount = Number(r.n) || articleCount
  } catch { /* fallback */ }

  const acContent = `# CodeMyShop — Architecte IA & Expert PrestaShop

> Consultant e-commerce senior, 11 ans d'expertise PrestaShop, créateur du Synedre (système multi-agents IA).

## À propos

CodeMyShop est un développeur et architecte e-commerce basé en France. Il conçoit des systèmes e-commerce souverains (code, données et infrastructure appartiennent au client) en combinant PrestaShop Headless, Nuxt 3, et un écosystème de ${agentCount} agents IA spécialisés appelé le Synedre.

## Expertise

- Architecture PrestaShop Headless + Nuxt 3
- Orchestration multi-agents IA (le Synedre — ${agentCount} agents spécialisés)
- Pipeline SEO automatisé (Content Intelligence)
- Souveraineté numérique (zéro lock-in, hébergement France)

## Contenu principal

- Blog technique : ${articleCount} articles sur PrestaShop, stratégie, SEO, DevOps, IA
- Academy gratuite : 16 modules pédagogiques avec mentors philosophiques
- Dictionnaire technique : glossaire e-commerce et IA

## URLs clés

- Page d'accueil : ${baseUrl}/
- Blog : ${baseUrl}/blog
- Academy : ${baseUrl}/academy
- Expertise : ${baseUrl}/expertise
- Équipe (${agentCount} agents IA) : ${baseUrl}/equipe
- Le Synedre en direct : ${baseUrl}/reacteur
- Dictionnaire : ${baseUrl}/dictionnaire
- Sitemap : ${baseUrl}/sitemap.xml

## Contact

- Email : contact@codemyshop.com
- Site : ${baseUrl}
`

  const cmsContent = `# CodeMyShop — PaaS E-commerce Souverain

> Plateforme e-commerce clé en main avec ${agentCount} agents IA intégrés. Vous possédez tout : code, données, infrastructure.

## À propos

CodeMyShop est une solution e-commerce souveraine conçue par CodeMyShop. Chaque client reçoit son propre VPS en France avec PrestaShop Headless, Nuxt 3, et ${agentCount} agents IA qui gèrent le SEO, le contenu, le design et la maintenance en continu.

## Offres

- Starter : blog SEO + réseaux sociaux automatisés (39€/mois)
- Premium : boutique e-commerce complète + ${agentCount} agents IA (15 000€ setup + 800€/mois)

## Différenciation

- Zéro lock-in (le client possède tout, peut partir avec son code)
- Hébergement souverain en France (VPS OVH dédié)
- ${agentCount} agents IA spécialisés intégrés (QA, SEO, Design, Copywriting, etc.)

## URLs clés

- Page d'accueil : ${baseUrl}/
- Innovation : ${baseUrl}/innovation
- Souveraineté : ${baseUrl}/souverainete-numerique
- Équipe IA : ${baseUrl}/equipe
- Sitemap : ${baseUrl}/sitemap.xml

## Contact

- Email : contact@codemyshop.com
- Site : ${baseUrl}
`

  setResponseHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  setResponseHeader(event, 'Cache-Control', 'public, max-age=86400')
  return isAC ? acContent : cmsContent
})
