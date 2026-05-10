/**
 *
 * POST /api/ai/growth-advice
 * Body : { targetRevenue, avgBasket, conversionRate, cac, requiredClients, requiredTraffic, marketingBudget, clientId, sector }
 * Returns : GrowthAdvice
 */

export interface GrowthAction {
  title:    string
  channel:  string
  impact:   string
  detail:   string
}

export interface GrowthAdvice {
  summary: string
  actions: GrowthAction[]
}

const STUB: GrowthAdvice = {
  summary: 'Votre objectif est ambitieux mais atteignable en 90 jours avec 3 leviers combin\u00e9s.',
  actions: [
    {
      title:   'R\u00e9activer les clients dormants par Broadcast WhatsApp',
      channel: 'WhatsApp',
      impact:  '+15% de CA r\u00e9current estim\u00e9',
      detail:  'Segmentez vos clients inactifs depuis 60+ jours. Envoyez un message personnalis\u00e9 avec une offre de r\u00e9activation (livraison offerte ou remise premi\u00e8re commande). Taux de r\u00e9ponse WhatsApp : 40%+.',
    },
    {
      title:   'Lancer une s\u00e9rie SEO longue tra\u00eene cibl\u00e9e',
      channel: 'Blog IA',
      impact:  '+4 000 visiteurs/mois en 8 semaines',
      detail:  'Publiez 3 articles/semaine sur des mots-cl\u00e9s \u00e0 faible concurrence li\u00e9s \u00e0 votre catalogue. Le Blog IA peut g\u00e9n\u00e9rer et publier automatiquement. Ciblez les requ\u00eates informationnelles pour attirer du trafic qualifi\u00e9.',
    },
    {
      title:   'Optimiser le taux de conversion avec la personnalisation Avatar',
      channel: 'Personnalisation IA',
      impact:  '+0.5 point de conversion (2.5% \u2192 3.0%)',
      detail:  'Activez la personnalisation par Avatar pour adapter les prix, visuels et CTA selon le profil visiteur (B2B/B2C). Gain moyen constat\u00e9 : +12-25% sur le taux de conversion.',
    },
  ],
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    targetRevenue:    number
    avgBasket:        number
    conversionRate:   number
    cac:              number
    requiredClients:  number
    requiredTraffic:  number
    marketingBudget:  number
    clientId:         string
    sector:           string
  }>(event)

  const systemPrompt = `Tu es un consultant en croissance e-commerce sp\u00e9cialis\u00e9 dans les strat\u00e9gies d\u2019acquisition pour les boutiques PrestaShop.
On te donne les KPIs de croissance d\u2019un marchand. Tu dois proposer exactement 3 actions ultra-pragmatiques et actionnables pour atteindre l\u2019objectif de CA.

Les outils disponibles dans l\u2019\u00e9cosyst\u00e8me CodeMyShop :
- Broadcast Center (Email + WhatsApp + SMS)
- Blog IA automatis\u00e9 (SEO longue tra\u00eene)
- Studio Social (Shorts/Reels IA)
- Personnalisation Avatar (B2B/B2C adapt\u00e9)
- Module Referral B2B (parrainage entre dirigeants)

R\u00c9PONDS UNIQUEMENT en JSON valide, sans markdown :
{
  "summary": "r\u00e9sum\u00e9 strat\u00e9gique en 1-2 phrases",
  "actions": [
    { "title": "titre action", "channel": "outil utilis\u00e9", "impact": "impact estim\u00e9 chiffr\u00e9", "detail": "explication d\u00e9taill\u00e9e 2-3 phrases" },
    { "title": "...", "channel": "...", "impact": "...", "detail": "..." },
    { "title": "...", "channel": "...", "impact": "...", "detail": "..." }
  ]
}`

  const userPrompt = `KPIs du marchand (${body.clientId}, secteur ${body.sector}) :
- Objectif CA mensuel : ${body.targetRevenue}\u20ac
- Panier moyen : ${body.avgBasket}\u20ac
- Taux de conversion actuel : ${body.conversionRate}%
- Co\u00fbt d\u2019acquisition client (CAC) : ${body.cac}\u20ac
- Clients n\u00e9cessaires/mois : ${body.requiredClients}
- Trafic n\u00e9cessaire/mois : ${body.requiredTraffic} visiteurs
- Budget marketing CAC estim\u00e9 : ${body.marketingBudget}\u20ac/mois

Propose 3 actions concr\u00e8tes pour atteindre cet objectif dans les 90 prochains jours.`

  try {
    const raw = await callAI(systemPrompt, userPrompt)
    if (raw.startsWith('[STUB]')) return STUB

    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return STUB

    const parsed = JSON.parse(match[0])
    return {
      summary: parsed.summary ?? '',
      actions: (parsed.actions ?? []).slice(0, 3),
    } satisfies GrowthAdvice
  } catch (err) {
    console.error('[growth-advice] error:', err)
    return STUB
  }
})
