

import { getTopOpportunities, getDecliningPages } from './gsc'
import { getInsights } from './analytics'
import { getClientConfigJson } from '~/internal/clientconfig/server/utils/clientconfig'

async function resolveClientGscSite(clientId: string): Promise<string> {
  
  try {
    const json = await getClientConfigJson(clientId, { global: true })
    if (json) {
      const cfg = JSON.parse(json)
      if (typeof cfg?.gscSiteUrl === 'string' && cfg.gscSiteUrl) return cfg.gscSiteUrl
    }
  } catch {}

  
  try {
    const { listActiveClientVps } = await import('~/internal/hub/server/utils/hub')
    const rows = await listActiveClientVps(clientId)
    const r = rows[0]
    if (r?.domain) return `https://${r.domain}`
  } catch {}
  return ''
}

export interface ContentBrief {
  title: string
  slug: string
  source: 'gsc-conquest' | 'gsc-defend' | 'matomo-search' | 'matomo-bounce' | 'fallback'
  priority: number       
  context: string        
  dataPoints: string[]   
}

const FALLBACK_TOPICS: ContentBrief[] = [
  {
    title: 'Migration Shopify vers PrestaShop Headless : guide complet 2026',
    slug: 'migration-shopify-prestashop-headless',
    source: 'fallback',
    priority: 5,
    context: 'Article technique ciblant les e-commerçants Shopify frustrés par les commissions. Montrer le ROI de la migration vers PrestaShop Headless + CodeMyShop.',
    dataPoints: ['Sujet evergreen', 'Intent transactionnel fort'],
  },
  {
    title: 'Core Web Vitals PrestaShop : comment passer de 30 à 95 sur PageSpeed',
    slug: 'core-web-vitals-prestashop-pagespeed',
    source: 'fallback',
    priority: 5,
    context: 'Guide technique SEO ciblant les e-commerçants avec un PrestaShop lent. Positionner CodeMyShop comme la solution architecture.',
    dataPoints: ['Sujet evergreen', 'Requête à fort volume'],
  },
  {
    title: 'IA e-commerce : 7 automatisations qui génèrent du CA pendant que vous dormez',
    slug: 'ia-ecommerce-automatisations-ca',
    source: 'fallback',
    priority: 5,
    context: 'Article orienté bénéfices business (pas tech) sur les automatisations IA de CodeMyShop. Cible : directeurs marketing PME.',
    dataPoints: ['Sujet tendance 2026', 'Intent informatif → transactionnel'],
  },
  {
    title: 'PrestaShop vs Shopify 2026 : comparatif honnête pour e-commerçants français',
    slug: 'prestashop-vs-shopify-comparatif-2026',
    source: 'fallback',
    priority: 6,
    context: 'Comparatif objectif mais positionné : souveraineté, commissions, SEO, IA. Cible : décideurs en phase de choix de plateforme.',
    dataPoints: ['Requête comparative à fort volume', 'Intent décisionnel'],
  },
  {
    title: 'Docker pour e-commerce : pourquoi votre boutique devrait tourner dans des conteneurs',
    slug: 'docker-ecommerce-conteneurs',
    source: 'fallback',
    priority: 7,
    context: 'Article technique démystifiant Docker pour les non-devs. Positionner l\'infra CodeMyShop comme différenciante.',
    dataPoints: ['Sujet technique à longue traîne', 'Positionnement expert'],
  },
]

export async function getNextTopic(clientId = 'ac-hub'): Promise<ContentBrief> {
  const briefs: ContentBrief[] = []

  
  const clientGscSite = await resolveClientGscSite(clientId)

  
  try {
    const gscOpps = await getTopOpportunities(clientGscSite || undefined, 28, 10)
    for (const opp of gscOpps) {
      if (opp.type === 'conquest') {
        briefs.push({
          title: `${capitalize(opp.query)} : guide complet pour e-commerçants`,
          slug: slugify(opp.query),
          source: 'gsc-conquest',
          priority: Math.max(1, Math.min(10, 10 - Math.floor(opp.score / 500))),
          context: `Mot-clé en position ${opp.position} avec ${opp.impressions} impressions/mois. Objectif : passer en page 1. Page existante : ${opp.page || 'aucune'}. Écrire un article exhaustif ciblant "${opp.query}" avec des données concrètes.`,
          dataPoints: [
            `Position actuelle: ${opp.position}`,
            `Impressions: ${opp.impressions}/mois`,
            `Clics actuels: ${opp.clicks}`,
            `CTR: ${opp.ctr}%`,
          ],
        })
      }
    }

    const declining = await getDecliningPages(clientGscSite || undefined, 5)
    for (const page of declining) {
      briefs.push({
        title: `[RÉÉCRITURE] ${page.page}`,
        slug: `rewrite-${slugify(page.page.split('/').pop() ?? 'page')}`,
        source: 'gsc-defend',
        priority: 2,  
        context: `Cette page a perdu plus de 30% de son trafic. Réécrire le contenu pour améliorer le CTR et regagner les positions. URL: ${page.page}`,
        dataPoints: [
          `Clics actuels: ${page.clicks} (en baisse)`,
          `Position: ${page.position}`,
        ],
      })
    }
  } catch (err: any) {
    console.warn(`[content-intelligence] GSC indisponible:`, err?.message?.slice(0, 100))
  }

  
  try {
    const insights = await getInsights(clientId)
    if (insights?.results) {
      
      const searchEvents = insights.results
        ?.filter((r: any) => r.name === 'search')
        ?.slice(0, 5)

      for (const evt of searchEvents ?? []) {
        const query = evt.properties?.query ?? ''
        if (query && query.length > 3) {
          briefs.push({
            title: `${capitalize(query)} — ce que nos visiteurs cherchent`,
            slug: slugify(query),
            source: 'matomo-search',
            priority: 3,
            context: `"${query}" est une recherche fréquente sur le site. Écrire un contenu qui répond directement à cette intention.`,
            dataPoints: [`Recherche interne fréquente: "${query}"`],
          })
        }
      }

      
      const bouncePages = insights.results
        ?.filter((r: any) => r.name === '$pageview' && (r.bounce_rate ?? 0) > 0.7)
        ?.slice(0, 3)

      for (const page of bouncePages ?? []) {
        briefs.push({
          title: `[OPTIMISER] ${page.url ?? 'page'}`,
          slug: `optimize-${slugify((page.url ?? '').split('/').pop() ?? 'page')}`,
          source: 'matomo-bounce',
          priority: 4,
          context: `Cette page a un taux de rebond de ${Math.round((page.bounce_rate ?? 0) * 100)}%. Le contenu ne répond pas aux attentes des visiteurs. Réécrire.`,
          dataPoints: [`Taux de rebond: ${Math.round((page.bounce_rate ?? 0) * 100)}%`],
        })
      }
    }
  } catch (err: any) {
    console.warn(`[content-intelligence] Matomo indisponible:`, err?.message?.slice(0, 100))
  }

  
  if (briefs.length === 0) {
    console.log(`[content-intelligence] Aucune donnée disponible — fallback activé`)
    
    const idx = Math.floor(Math.random() * FALLBACK_TOPICS.length)
    return FALLBACK_TOPICS[idx]
  }

  
  briefs.sort((a, b) => a.priority - b.priority)

  const winner = briefs[0]
  console.log(`[content-intelligence] Sujet sélectionné: "${winner.title}" (source: ${winner.source}, priorité: ${winner.priority})`)
  console.log(`[content-intelligence]   Données: ${winner.dataPoints.join(' | ')}`)

  return winner
}

export async function getTopicQueue(clientId = 'ac-hub', limit = 5): Promise<ContentBrief[]> {
  const topic = await getNextTopic(clientId)
  
  
  const queue = [topic]

  
  for (const fb of FALLBACK_TOPICS) {
    if (queue.length >= limit) break
    if (!queue.find(q => q.slug === fb.slug)) {
      queue.push(fb)
    }
  }

  return queue.slice(0, limit)
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}
