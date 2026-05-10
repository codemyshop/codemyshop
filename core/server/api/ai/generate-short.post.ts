/**
 *
 * POST /api/ai/generate-short
 * Body : { source: 'product'|'event'|'news', content: string, clientId: string, tone: string }
 * Returns : ShortScript
 */

export interface ShortScript {
  hook:              string
  benefits:          string[]
  cta:               string
  visualDirections:  string[]
  hashtags:          string[]
  estimatedDuration: number
}

const TONE_MAP: Record<string, string> = {
  smokevape:  'énergétique, funky et percutant — texte court, emojis, argot jeune',
  example-shop:    'professionnel, expert et rassurant — vocabulaire B2B, sobre',
  codemyshop: 'tech, enthousiaste et innovant — orienté résultats, moderne',
  'ac-hub':   'professionnel mais accessible — clair, direct, sans jargon',
}

const STUB: ShortScript = {
  hook:             '🎬 Découvrez ce qui change tout pour votre boutique !',
  benefits:         [
    '✅ Résultat concret visible dès J+1',
    '✅ Zéro configuration complexe — clé en main',
    '✅ +20% de conversion en moyenne (clients actuels)',
  ],
  cta:              '👉 Lien en bio — démo gratuite 14 jours',
  visualDirections: [
    'Ouverture : texte animé sur fond sombre, zoom in sur le produit',
    'Milieu : montage 3 plans rapides 9:16, musique énergique',
    'Fin : logo centré + CTA en overlay blanc — fadeout',
  ],
  hashtags:         ['#PrestaShop', '#ECommerce', '#MarketingDigital', '#ShortVideo', '#IA'],
  estimatedDuration: 58,
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    source:   'product' | 'event' | 'news'
    content:  string
    clientId: string
    tone?:    string
  }>(event)

  const tonePref = TONE_MAP[body.clientId] ?? body.tone ?? 'professionnel et accessible'

  const sourceLabel: Record<string, string> = {
    product: 'un produit',
    event:   'un événement',
    news:    'une actualité',
  }

  const systemPrompt = `Tu es un expert en marketing vidéo courte durée (Shorts YouTube, Reels Instagram, TikTok).
Tu génères des scripts structurés pour des vidéos verticales 9:16 de 60 secondes maximum.
Ton imposé : ${tonePref}.
Réponds UNIQUEMENT avec un objet JSON valide respectant ce schéma exact, sans markdown :
{
  "hook": "phrase d’accroche puissante max 15 mots",
  "benefits": ["avantage 1", "avantage 2", "avantage 3"],
  "cta": "appel à l’action court et direct",
  "visualDirections": ["direction visuelle 1", "direction visuelle 2", "direction visuelle 3"],
  "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"],
  "estimatedDuration": 58
}`

  const userPrompt = `Génère un script Short vidéo pour ${sourceLabel[body.source] ?? 'un contenu'}.

Contenu source :
${body.content.slice(0, 1500)}

Client : ${body.clientId}
Ton : ${tonePref}`

  try {
    const raw = await callAI(systemPrompt, userPrompt)

    // Si stub (callAI renvoie '[STUB]…' quand pas de clé API)
    if (raw.startsWith('[STUB]')) return STUB

    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return STUB

    const script = JSON.parse(match[0]) as ShortScript
    return script
  } catch (err) {
    console.error('[generate-short] error:', err)
    return STUB
  }
})
