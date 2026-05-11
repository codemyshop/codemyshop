

export interface NurturingStep {
  dayOffset: number
  channel:   'email' | 'whatsapp'
  subject:   string
  body:      string
  goal:      string
}

export interface NurturingSequence {
  objective: string
  avatar:    string
  steps:     NurturingStep[]
}

const STEP_COUNTS: Record<string, number> = { short: 3, medium: 5, long: 7 }

const STUB: NurturingSequence = {
  objective: 'Onboarding nouveau client',
  avatar:    'Acheteur Pro',
  steps: [
    { dayOffset: 0,  channel: 'email',    subject: 'Bienvenue chez nous',                    body: 'Merci pour votre premi\u00e8re commande ! Voici comment tirer le meilleur de votre espace pro...', goal: 'Activer le compte et pr\u00e9senter les fonctionnalit\u00e9s cl\u00e9s' },
    { dayOffset: 2,  channel: 'whatsapp', subject: '',                                        body: 'Bonjour ! Votre compte pro est pr\u00eat. Besoin d\u2019aide pour votre prochaine commande ? \u2192 [LIEN]', goal: 'Cr\u00e9er un premier contact humain sur canal direct' },
    { dayOffset: 7,  channel: 'email',    subject: 'Vos avantages pro en un coup d\u2019oeil', body: 'Franco d\u00e8s 300\u20ac HT, paiement diff\u00e9r\u00e9, conseiller d\u00e9di\u00e9... D\u00e9couvrez tout ce qui est inclus.', goal: '\u00c9duquer sur la valeur du programme pro' },
    { dayOffset: 14, channel: 'email',    subject: 'S\u00e9lection personnalis\u00e9e pour vous', body: 'Bas\u00e9 sur votre profil, voici 3 produits qui pourraient int\u00e9resser votre \u00e9tablissement...', goal: 'G\u00e9n\u00e9rer la deuxi\u00e8me commande' },
    { dayOffset: 21, channel: 'whatsapp', subject: '',                                        body: 'Comment se passe votre exp\u00e9rience ? On est l\u00e0 si vous avez des questions \ud83d\udc4d', goal: 'R\u00e9colter du feedback et fidéliser' },
  ],
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    objective:   string
    avatarName:  string
    avatarRules: string
    duration:    string
    channels:    string
    clientId:    string
  }>(event)

  
  const objective = (body.objective ?? '').trim().slice(0, 500)
  const avatarName = (body.avatarName ?? '').trim().slice(0, 100)
  const avatarRules = (body.avatarRules ?? '').trim().slice(0, 1000)
  const stepCount = STEP_COUNTS[body.duration] ?? 5
  const mixChannels = body.channels === 'mix'

  if (!objective) {
    throw createError({ statusCode: 400, message: 'Objectif requis' })
  }

  const channelInstruction = mixChannels
    ? `Alterne entre "email" et "whatsapp". Les WhatsApp doivent \u00eatre courts (< 160 chars), directs, avec emojis naturels. Les emails sont structur\u00e9s avec sujet + corps.`
    : `Utilise uniquement le canal "email" pour tous les messages. Chaque \u00e9tape a un sujet accrocheur et un corps structur\u00e9.`

  const systemPrompt = `Tu es un expert en s\u00e9quences de nurturing e-commerce.
G\u00e9n\u00e8re une s\u00e9quence de ${stepCount} messages pour l\u2019objectif donn\u00e9.

Avatar cible : ${avatarName}
R\u00e8gles de ton : ${avatarRules || 'professionnel et accessible'}

${channelInstruction}

Les d\u00e9lais (dayOffset) doivent \u00eatre progressifs et r\u00e9alistes : J+0, J+2, J+5, J+10, J+14, J+21, J+30.

R\u00c9PONDS UNIQUEMENT en JSON valide, sans markdown :
{
  "steps": [
    { "dayOffset": 0, "channel": "email", "subject": "...", "body": "...", "goal": "..." },
    ...
  ]
}`

  const userPrompt = `Objectif de la s\u00e9quence : ${objective}
Client : ${body.clientId ?? 'g\u00e9n\u00e9rique'}
Nombre d\u2019\u00e9tapes : ${stepCount}
Mix canaux : ${mixChannels ? 'oui (email + whatsapp)' : 'email uniquement'}`

  try {
    const raw = await callAI(systemPrompt, userPrompt)
    if (raw.startsWith('[STUB]')) return { ...STUB, objective, avatar: avatarName }

    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return { ...STUB, objective, avatar: avatarName }

    const parsed = JSON.parse(match[0])
    return {
      objective,
      avatar: avatarName,
      steps:  (parsed.steps ?? []).slice(0, stepCount).map((s: any) => ({
        dayOffset: Number(s.dayOffset ?? 0),
        channel:   s.channel === 'whatsapp' ? 'whatsapp' : 'email',
        subject:   String(s.subject ?? '').slice(0, 200),
        body:      String(s.body ?? '').slice(0, 2000),
        goal:      String(s.goal ?? '').slice(0, 300),
      })),
    } satisfies NurturingSequence
  } catch (err) {
    console.error('[generate-nurturing] error:', err)
    return { ...STUB, objective, avatar: avatarName }
  }
})
