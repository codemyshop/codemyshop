/**
 *
 * POST /api/ai/youtube-script-data
 * Body : { clientId, videoTopic, targetAudience }
 * Returns : DataDrivenStoryboard
 *
 * SECURITY.md R3: only aggregated metrics (no PII) are sent to the LLM.
 * SECURITY.md R4: inputs validated and limited.
 */

export interface DataScene {
  sceneNumber:     number
  hook:            string
  voiceOver:       string
  bRoll_Text:      string
  visual_Prompt_Pixar3D: string
}

export interface DataDrivenStoryboard {
  title:    string
  context:  ClientContext
  scenes:   DataScene[]
  cta:      string
  duration: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    clientId:       string
    videoTopic:     string
    targetAudience: string
  }>(event)

  // R4 : validation
  const clientId       = (body.clientId ?? '').trim().slice(0, 50)
  const videoTopic     = (body.videoTopic ?? '').trim().slice(0, 500)
  const targetAudience = (body.targetAudience ?? '').trim().slice(0, 200)

  if (!clientId || !videoTopic) {
    throw createError({ statusCode: 400, message: 'clientId et videoTopic requis' })
  }

  // 1. Agr\u00e9ger le contexte client via le connecteur (CMS-agnostique)
  const { getConnector } = await import('~/server/connectors/base')
  const connector = getConnector(clientId)
  const context = await connector.getClientContext()

  // 2. Construire le prompt avec les vraies donn\u00e9es
  const systemPrompt = `Tu es un expert E-commerce High-Ticket et producteur YouTube B2B.

R\u00e8dige un script vid\u00e9o dynamique en 5 plans.
Utilise les VRAIES donn\u00e9es du client ci-dessous pour illustrer son probl\u00e8me.
Ensuite, explique techniquement comment l\u2019architecture CodeMyShop (Nuxt 3 Headless, IA int\u00e9gr\u00e9e, 0% commission) est la solution absolue.

DONN\u00c9ES CLIENT (contexte r\u00e9el) :
- Nom : ${context.clientName}
- Catalogue : ${context.totalProducts} produits dans ${context.totalCategories} cat\u00e9gories
- Panier moyen : ${context.avgPriceFormatted}
- Fourchette de prix : ${context.priceRange.min}\u20ac \u2013 ${context.priceRange.max}\u20ac
- Top cat\u00e9gories : ${context.topCategories.join(', ') || 'N/A'}
- Typologie : ${context.businessType}
- Taille catalogue : ${context.catalogStrength}

R\u00c8GLES :
- Plan 1 = HOOK percutant (chiffre choc li\u00e9 aux donn\u00e9es r\u00e9elles du client)
- Plans 2-4 = D\u00e9veloppement avec les m\u00e9triques du client + solution technique
- Plan 5 = CTA vers le Simulateur de Croissance CodeMyShop
- Chaque "visual_Prompt_Pixar3D" en ANGLAIS : "3D Pixar style, [sc\u00e8ne], [lumi\u00e8re], 16:9"
- Chaque voiceOver = 15-20 secondes de lecture
- Public vis\u00e9 : ${targetAudience || 'Dirigeants e-commerce'}

R\u00c9PONDS UNIQUEMENT en JSON valide, sans markdown :
{
  "title": "titre YouTube accrocheur utilisant les donn\u00e9es client",
  "scenes": [
    {
      "sceneNumber": 1,
      "hook": "phrase d\u2019accroche courte",
      "voiceOver": "texte voix off complet",
      "bRoll_Text": "texte \u00e0 incruster au montage",
      "visual_Prompt_Pixar3D": "3D Pixar style, ..., 16:9"
    }
  ],
  "cta": "call to action final",
  "duration": "dur\u00e9e estim\u00e9e"
}`

  const userPrompt = `Sujet vid\u00e9o : ${videoTopic}
Public : ${targetAudience || 'Dirigeants e-commerce'}
Client source : ${context.clientName} (${context.businessType}, ${context.totalProducts} produits)`

  try {
    const raw = await callAI(systemPrompt, userPrompt)
    if (!raw || raw.startsWith('[STUB]') || raw.length < 20) return buildStub(context, videoTopic)

    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return buildStub(context, videoTopic)

    const parsed = JSON.parse(match[0])
    return {
      title:    String(parsed.title ?? '').slice(0, 200),
      context,
      scenes:   (parsed.scenes ?? []).slice(0, 8).map((s: any, i: number) => ({
        sceneNumber:          i + 1,
        hook:                 String(s.hook ?? '').slice(0, 300),
        voiceOver:            String(s.voiceOver ?? s.voiceover ?? '').slice(0, 1000),
        bRoll_Text:           String(s.bRoll_Text ?? s.broll_text ?? '').slice(0, 200),
        visual_Prompt_Pixar3D: String(s.visual_Prompt_Pixar3D ?? s.visual_prompt ?? s.imagePrompt ?? '').slice(0, 500),
      })),
      cta:      String(parsed.cta ?? '').slice(0, 500),
      duration: String(parsed.duration ?? '~1min30').slice(0, 20),
    } satisfies DataDrivenStoryboard
  } catch (err) {
    console.error('[youtube-script-data] error:', err)
    return buildStub(context, videoTopic)
  }
})

function buildStub(ctx: ClientContext, topic: string): DataDrivenStoryboard {
  return {
    title: `Comment ${ctx.clientName} optimise ses ${ctx.totalProducts} produits avec CodeMyShop`,
    context: ctx,
    scenes: [
      {
        sceneNumber: 1,
        hook: `${ctx.totalProducts} produits, ${ctx.totalCategories} cat\u00e9gories, un panier moyen de ${ctx.avgPriceFormatted} \u2014 et pourtant, le site rame.`,
        voiceOver: `Imaginez : vous g\u00e9rez un catalogue de ${ctx.totalProducts} produits ${ctx.businessType} r\u00e9partis dans ${ctx.totalCategories} cat\u00e9gories. Votre panier moyen est de ${ctx.avgPriceFormatted}. Et pourtant, chaque seconde de chargement vous co\u00fbte des clients.`,
        bRoll_Text: `${ctx.totalProducts} produits \u00b7 ${ctx.avgPriceFormatted} panier moyen`,
        visual_Prompt_Pixar3D: '3D Pixar style, a warehouse manager looking overwhelmed at endless product shelves with a slow loading bar above, dramatic warehouse lighting, 16:9',
      },
      {
        sceneNumber: 2,
        hook: 'Le vrai co\u00fbt de la lenteur',
        voiceOver: `Avec un panier moyen de ${ctx.avgPriceFormatted}, chaque seconde de chargement suppl\u00e9mentaire co\u00fbte 7% de conversions. Sur ${ctx.totalProducts} produits actifs, c\u2019est un manque \u00e0 gagner consid\u00e9rable chaque mois.`,
        bRoll_Text: '-7% conversion par seconde',
        visual_Prompt_Pixar3D: '3D Pixar style, a giant clock melting like Dali with euro coins falling, ecommerce dashboard in background showing red metrics, cinematic lighting, 16:9',
      },
      {
        sceneNumber: 3,
        hook: `La solution headless pour le ${ctx.businessType}`,
        voiceOver: `L\u2019architecture CodeMyShop d\u00e9couple le frontend Nuxt 3 du backend PrestaShop. R\u00e9sultat : les ${ctx.totalProducts} fiches produit se chargent en moins de 800 millisecondes. Score PageSpeed : 100 sur 100.`,
        bRoll_Text: 'PageSpeed 100 \u00b7 TTFB < 800ms',
        visual_Prompt_Pixar3D: '3D Pixar style, a split screen showing old slow website transforming into blazing fast modern interface, green success metrics, bright optimistic lighting, 16:9',
      },
      {
        sceneNumber: 4,
        hook: 'Z\u00e9ro commission, 100% propri\u00e9taire',
        voiceOver: `Et le meilleur ? Z\u00e9ro pour cent de commission sur vos ventes. Pour un catalogue ${ctx.businessType} avec des prix entre ${ctx.priceRange.min}\u20ac et ${ctx.priceRange.max}\u20ac, c\u2019est des milliers d\u2019euros \u00e9conomis\u00e9s chaque ann\u00e9e.`,
        bRoll_Text: '0% commission \u00b7 H\u00e9bergement souverain FR',
        visual_Prompt_Pixar3D: '3D Pixar style, two characters comparing invoices, one shocked by Shopify fees, other smiling with CodeMyShop zero commission, clean office, 16:9',
      },
      {
        sceneNumber: 5,
        hook: 'Calculez vos \u00e9conomies',
        voiceOver: 'Utilisez notre Simulateur de Croissance gratuit pour calculer combien vous \u00e9conomiseriez. Le lien est dans la description. Premi\u00e8re consultation strat\u00e9gique offerte.',
        bRoll_Text: 'Simulateur gratuit \u2192 lien en description',
        visual_Prompt_Pixar3D: '3D Pixar style, a happy business owner pointing at a floating holographic calculator showing massive savings, confetti, bright green colors, 16:9',
      },
    ],
    cta: 'Testez le Simulateur de Croissance CodeMyShop \u2014 lien en description. Consultation gratuite.',
    duration: '~1min30',
  }
}
