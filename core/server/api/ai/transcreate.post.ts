/**
 *
 * POST /api/ai/transcreate
 * Body : { text, targetLocale, avatarType?, clientTone?, productName? }
 * Returns : TranscreationResult
 */

export interface TranscreationResult {
  locale:         string
  transcreated:   string
  culturalNotes:  string[]
  adaptations:    string[]
}

const STUB_RESULTS: Record<string, TranscreationResult> = {
  en: {
    locale:       'en',
    transcreated: '[DEMO] Premium product crafted with expertise. Trusted by professionals across Europe. Fast delivery, unmatched quality.',
    culturalNotes: [
      'Tone shifted from passionate/artisanal to pragmatic/benefit-driven',
      'Added social proof element ("trusted by professionals")',
      'Emphasized speed and reliability over tradition',
    ],
    adaptations: [
      '"Savoir-faire artisanal" \u2192 "crafted with expertise"',
      '"S\u00e9lection rigoureuse" \u2192 "unmatched quality"',
      'Removed terroir references \u2014 not resonant in Anglo-Saxon markets',
    ],
  },
  de: {
    locale:       'de',
    transcreated: '[DEMO] Premium-Produkt h\u00f6chster Qualit\u00e4t. Zuverl\u00e4ssige Lieferung, gepr\u00fcfte Herkunft. Ihr Partner f\u00fcr professionelle Anforderungen.',
    culturalNotes: [
      'Formeller Ton (Sie-Form) f\u00fcr B2B-Kontext',
      'Fokus auf Zuverl\u00e4ssigkeit und Qualit\u00e4tssicherung',
      'Technische Pr\u00e4zision statt emotionaler Beschreibung',
    ],
    adaptations: [
      '"Passion du terroir" \u2192 "gepr\u00fcfte Herkunft" (verified origin)',
      '"Go\u00fbt authentique" \u2192 "h\u00f6chster Qualit\u00e4t" (highest quality)',
      'Added Zuverl\u00e4ssigkeit (reliability) \u2014 key German B2B value',
    ],
  },
  fr: {
    locale:       'fr',
    transcreated: '[DEMO] Texte original conserv\u00e9 \u2014 pas de transcr\u00e9ation n\u00e9cessaire pour la m\u00eame langue.',
    culturalNotes: ['Langue source = langue cible. Aucune adaptation culturelle appliqu\u00e9e.'],
    adaptations:  [],
  },
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    text:         string
    targetLocale: string
    avatarType?:  string
    clientTone?:  string
    productName?: string
  }>(event)

  const { text, targetLocale, avatarType, clientTone, productName } = body
  const profile = getCulturalProfile(targetLocale)

  const systemPrompt = `Tu es un expert en transcr\u00e9ation marketing multilingue (pas un simple traducteur).
La transcr\u00e9ation adapte le MESSAGE, pas seulement les mots. Tu dois recr\u00e9er le texte pour qu\u2019il r\u00e9sonne avec la psychologie d\u2019achat du march\u00e9 cible.

LANGUE CIBLE : ${profile.label} (${profile.locale})
TON IMPOS\u00c9 : ${profile.tone}
PSYCHOLOGIE ACHETEUR : ${profile.buyerPsych}
NIVEAU DE FORMALIT\u00c9 : ${profile.formalLevel}
MOTS-CL\u00c9S \u00c0 PRIVIL\u00c9GIER : ${profile.keywords.join(', ')}
MOTS \u00c0 \u00c9VITER : ${profile.avoidWords.join(', ')}
${avatarType ? `AVATAR CLIENT : ${avatarType}` : ''}
${clientTone ? `TON DU CLIENT : ${clientTone}` : ''}

R\u00c9PONDS UNIQUEMENT en JSON valide, sans markdown :
{
  "transcreated": "le texte transcr\u00e9\u00e9 dans la langue cible",
  "culturalNotes": ["note 1 sur les adaptations culturelles", "note 2", "note 3"],
  "adaptations": ["expression FR \u2192 expression locale (explication)", "..."]
}`

  const userPrompt = `Transcr\u00e9e le texte suivant pour le march\u00e9 ${profile.label} :

${productName ? `Produit : ${productName}\n` : ''}TEXTE ORIGINAL (FR) :
${text.slice(0, 2000)}`

  try {
    const raw = await callAI(systemPrompt, userPrompt)

    if (raw.startsWith('[STUB]')) {
      return STUB_RESULTS[targetLocale] ?? STUB_RESULTS['en']
    }

    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return STUB_RESULTS[targetLocale] ?? STUB_RESULTS['en']

    const parsed = JSON.parse(match[0])
    return {
      locale:        targetLocale,
      transcreated:  parsed.transcreated ?? '',
      culturalNotes: parsed.culturalNotes ?? [],
      adaptations:   parsed.adaptations ?? [],
    } satisfies TranscreationResult
  } catch (err) {
    console.error('[transcreate] error:', err)
    return STUB_RESULTS[targetLocale] ?? STUB_RESULTS['en']
  }
})
