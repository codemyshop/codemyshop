/**
 *
 * POST /api/ai/youtube-script
 * Body : { subject, avatar, tone, clientId }
 * Returns : YouTubeStoryboard
 *
 * SECURITY.md R3: no PII. R4: inputs validated and limited.
 */

export interface StoryboardScene {
  sceneNumber:  number
  duration:     string
  voiceover:    string
  imagePrompt:  string
  screenText:   string
  goal:         string
}

export interface YouTubeStoryboard {
  title:       string
  hook:        string
  scenes:      StoryboardScene[]
  cta:         string
  totalLength: string
}

const STUB: YouTubeStoryboard = {
  title: 'Pourquoi votre boutique e-commerce perd 40% de CA',
  hook:  'Votre page produit met plus de 3 secondes \u00e0 charger ? Vous perdez 40% de vos clients avant m\u00eame qu\u2019ils voient vos produits.',
  scenes: [
    {
      sceneNumber: 1, duration: '0:00-0:05',
      voiceover: 'Votre page produit met plus de 3 secondes \u00e0 charger ? Vous perdez 40% de vos clients.',
      imagePrompt: '3D Pixar style, a frustrated entrepreneur staring at a loading spinner on a giant screen, dramatic red lighting, server room in background, cinematic 16:9',
      screenText: '-40% de conversion',
      goal: 'Hook — capter l\u2019attention en 5 secondes',
    },
    {
      sceneNumber: 2, duration: '0:05-0:25',
      voiceover: 'Chaque seconde de chargement suppl\u00e9mentaire co\u00fbte en moyenne 7% de conversions. Sur un CA de 500 000 euros, c\u2019est 35 000 euros par an dans le vent.',
      imagePrompt: '3D Pixar style, a pile of euro bills flying out of a laptop screen into a black hole, office background, warm studio lighting, 16:9',
      screenText: '1s = -7% conversion | 35 000\u20ac/an perdus',
      goal: 'D\u00e9veloppement — chiffrer le probl\u00e8me',
    },
    {
      sceneNumber: 3, duration: '0:25-0:50',
      voiceover: 'La solution ? Une architecture headless. Le front-end Nuxt g\u00e9n\u00e8re vos pages en moins de 800 millisecondes. Score PageSpeed : 100.',
      imagePrompt: '3D Pixar style, a confident developer character presenting a glowing dashboard showing 100/100 score, green metrics, modern office, bright optimistic lighting, 16:9',
      screenText: 'PageSpeed 100 | TTFB < 800ms',
      goal: 'Solution — pr\u00e9senter l\u2019architecture headless',
    },
    {
      sceneNumber: 4, duration: '0:50-1:05',
      voiceover: 'Et le meilleur ? Z\u00e9ro commission sur vos ventes. Contrairement \u00e0 Shopify qui pr\u00e9l\u00e8ve 2% sur chaque transaction.',
      imagePrompt: '3D Pixar style, two characters side by side — one happy with 0% sign, one sad giving money away, split screen comparison, clean white background, 16:9',
      screenText: '0% commission vs Shopify 2%',
      goal: 'Diff\u00e9renciateur — z\u00e9ro commission',
    },
    {
      sceneNumber: 5, duration: '1:05-1:20',
      voiceover: 'Calculez combien vous \u00e9conomiseriez avec notre simulateur gratuit. Le lien est dans la description.',
      imagePrompt: '3D Pixar style, a character pointing at a floating calculator hologram showing savings, excited expression, bright green success colors, 16:9',
      screenText: 'Simulateur gratuit \u2192 lien en description',
      goal: 'CTA — renvoyer vers le simulateur',
    },
  ],
  cta: 'Testez le Simulateur de Croissance : lien dans la description. Premi\u00e8re consultation gratuite.',
  totalLength: '~1min20',
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    subject:  string
    target:   string
    tone:     string
    clientId: string
  }>(event)

  // R4 : validation
  const subject  = (body.subject ?? '').trim().slice(0, 500)
  const target   = (body.target ?? '').trim().slice(0, 200)
  const tone     = (body.tone ?? '').trim().slice(0, 100)

  if (!subject) throw createError({ statusCode: 400, message: 'Sujet requis' })

  const systemPrompt = `Tu es un producteur de vid\u00e9os YouTube B2B sp\u00e9cialis\u00e9 dans les contenus illustr\u00e9s avec des personnages 3D style Pixar.

Tu produis des storyboards structur\u00e9s pour des vid\u00e9os de 1 \u00e0 2 minutes.

R\u00c8GLES :
- Plan 1 = HOOK puissant dans les 5 premi\u00e8res secondes (chiffre choc ou question provocante)
- Plans 2-4 = D\u00e9veloppement clair avec chiffres et preuves
- Dernier plan = CTA vers le Simulateur de Croissance CodeMyShop
- Chaque "imagePrompt" doit \u00eatre en ANGLAIS, optimis\u00e9 pour g\u00e9n\u00e9rateurs d\u2019images IA (style Nano Banana 2)
- Format obligatoire des imagePrompt : "3D Pixar style, [description du plan], [ambiance lumineuse], 16:9"
- Chaque voiceover = 15-20 secondes de lecture

Tonalit\u00e9 de la vid\u00e9o : ${tone || 'P\u00e9dagogique'}
Public vis\u00e9 : \${target || 'E-commer\u00e7ants'}

R\u00c9PONDS UNIQUEMENT en JSON valide, sans markdown :
{
  "title": "titre YouTube accrocheur",
  "hook": "phrase d\u2019accroche des 5 premi\u00e8res secondes",
  "scenes": [
    {
      "sceneNumber": 1,
      "duration": "0:00-0:05",
      "voiceover": "texte voix off",
      "imagePrompt": "3D Pixar style, ..., 16:9",
      "screenText": "texte \u00e0 incruster",
      "goal": "objectif de la sc\u00e8ne"
    }
  ],
  "cta": "call to action final",
  "totalLength": "dur\u00e9e estim\u00e9e"
}`

  const userPrompt = `Storyboard YouTube B2B de 5 plans pour :

Sujet : ${subject}
Public cible : \${target || 'E-commer\u00e7ants B2B'}
Ton : ${tone || 'P\u00e9dagogique'}
Client : ${body.clientId ?? 'CodeMyShop'}`

  try {
    const raw = await callAI(systemPrompt, userPrompt)
    if (!raw || raw.startsWith('[STUB]') || raw.length < 10) return STUB

    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return STUB

    const parsed = JSON.parse(match[0])
    return {
      title:       String(parsed.title ?? '').slice(0, 200),
      hook:        String(parsed.hook ?? '').slice(0, 500),
      scenes:      (parsed.scenes ?? []).slice(0, 8).map((s: any, i: number) => ({
        sceneNumber: i + 1,
        duration:    String(s.duration ?? '').slice(0, 20),
        voiceover:   String(s.voiceover ?? '').slice(0, 1000),
        imagePrompt: String(s.imagePrompt ?? '').slice(0, 500),
        screenText:  String(s.screenText ?? '').slice(0, 200),
        goal:        String(s.goal ?? '').slice(0, 300),
      })),
      cta:         String(parsed.cta ?? '').slice(0, 500),
      totalLength: String(parsed.totalLength ?? '~1min').slice(0, 20),
    } satisfies YouTubeStoryboard
  } catch (err) {
    console.error('[youtube-script] error:', err)
    return STUB
  }
})
