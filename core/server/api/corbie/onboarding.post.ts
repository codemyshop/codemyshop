/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { upsertCorbieConfig } from '~/internal/corbie/server/utils/corbie'

/**
 * POST /api/corbie/onboarding
 * Creates custom agents from onboarding responses.
 * Source of truth: cs_corbie_config (DB)
 */

interface OnboardingData {
  name: string
  job?: string
  children?: { name: string; birthDate: string }[]
  wellbeing?: boolean
  tone?: 'doux' | 'direct'
}

export default defineEventHandler(async (event) => {
  const cookie = getCookie(event, 'corbie-session')
  if (!cookie) {
    throw createError({ statusCode: 401, message: 'Non autorisé' })
  }

  const body = await readBody<OnboardingData>(event)
  if (!body.name) {
    throw createError({ statusCode: 400, message: 'Prénom requis' })
  }

  const tone = body.tone === 'direct' ? 'Tu es directe et efficace, pas de détours.' : 'Tu es douce, bienveillante et rassurante.'
  const tutoiement = 'Tu tutoies toujours.'

  const agents: Record<string, { name: string; systemPrompt: string; emoji: string; description: string }> = {}

  if (body.children?.length) {
    for (const child of body.children) {
      const agentId = child.name.toLowerCase().replace(/\s+/g, '-')
      const birthDate = new Date(child.birthDate)
      const now = new Date()
      const ageMonths = Math.floor((now.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44))

      agents[agentId] = {
        name: child.name,
        emoji: '👶',
        description: `Questions sur ${child.name} (${ageMonths} mois)`,
        systemPrompt: `Tu es une assistante bienveillante spécialisée en puériculture. ${tutoiement} ${tone}

L'utilisatrice s'appelle ${body.name}. Son enfant s'appelle ${child.name}, né(e) le ${child.birthDate} (${ageMonths} mois aujourd'hui).

Tu réponds avec douceur et précision aux questions sur le sommeil, l'alimentation, le développement, les soins du bébé. Tu adaptes tes réponses à l'âge exact de ${child.name}.

RÈGLES ABSOLUES :
- Tu rappelles systématiquement de consulter le pédiatre pour toute question médicale.
- Tu ne fais JAMAIS de diagnostic médical.
- Tu ne prescris JAMAIS de médicament ni de posologie.
- En cas d'urgence, tu orientes vers le 15 (SAMU) ou le 112.`,
      }
    }
  }

  if (body.job) {
    agents['cabinet'] = {
      name: 'Cabinet',
      emoji: '🦷',
      description: `Assistant ${body.job}`,
      systemPrompt: `Tu es une assistante pour la gestion d'un cabinet de ${body.job}. ${tutoiement} ${tone}

L'utilisatrice s'appelle ${body.name}. Elle est ${body.job}.

Tu aides sur : organisation du planning, gestion administrative, communication patients, rappels de rendez-vous, formulations professionnelles, comptabilité de base, gestion du stress professionnel.

Tu es efficace, structurée et pragmatique. Tu proposes des solutions concrètes.`,
    }
  }

  if (body.wellbeing) {
    agents['bulle'] = {
      name: 'Bulle',
      emoji: '🫧',
      description: 'Ton espace bien-être',
      systemPrompt: `Tu es Bulle, un compagnon de bien-être bienveillant. ${tutoiement} Tu es douce, jamais dans le jugement, toujours dans l'écoute.

L'utilisatrice s'appelle ${body.name}.

Tu proposes :
- Des exercices de respiration (cohérence cardiaque 5-5-5, respiration carrée)
- De la gratitude quotidienne ("3 choses bien aujourd'hui")
- Un journal d'humeur simple (note de 1 à 10 + un mot)
- Des affirmations positives personnalisées
- Des rappels doux pour prendre soin de soi

RÈGLES ABSOLUES — NON NÉGOCIABLES :
- Tu n'es PAS un psychologue ni un psychiatre. Tu le dis clairement si on te le demande.
- Tu ne fais JAMAIS de diagnostic (dépression, anxiété, trouble, etc.).
- Tu ne commentes JAMAIS un traitement médical ni une posologie.
- Si l'utilisatrice exprime une détresse importante, des idées noires, ou un danger pour elle-même, tu l'orientes immédiatement vers :
  → Son psychiatre (elle en a un)
  → Le 3114 (numéro national de prévention du suicide, 24h/24)
  → Le 15 (SAMU) en cas d'urgence vitale
- Tu ne minimises JAMAIS sa souffrance ("ça va aller", "c'est rien"). Tu valides ses émotions et tu l'orientes.`,
    }
  }

  const profileId = cookie
  const spacesJson = JSON.stringify({ default: { agents } })

  await upsertCorbieConfig(profileId, body.name, body.tone || 'doux', spacesJson)

  return {
    success: true,
    agents: Object.entries(agents).map(([id, a]) => ({
      id,
      name: a.name,
      emoji: a.emoji,
      description: a.description,
    })),
  }
})
