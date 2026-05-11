

import type { VisitorAvatar, VisitorSignals, AvatarType } from '~/types/avatar'
import { callAI } from '~/server/utils/ai'

const SYSTEM_PROMPT = `
Tu es un classificateur de visiteurs web pour un consultant freelance spécialisé PrestaShop / Nuxt.
Ton rôle : analyser les signaux comportementaux et retourner UN seul avatar parmi la liste fournie.

Avatars disponibles :
- prospect-ecommerce  : cherche à créer ou améliorer une boutique en ligne (PrestaShop, Nuxt, SEO)
- client-maintenance  : client existant qui parle de support, maintenance, contrat, bug
- agence              : agence web cherchant un sous-traitant ou un expert technique
- entrepreneur        : créateur de projet, startup, idée à concrétiser
- unknown             : signaux insuffisants ou non-classifiable

Réponds UNIQUEMENT en JSON valide, sans markdown, sans commentaire :
{
  "type": "<avatar-type>",
  "label": "<libellé humain>",
  "confidence": <0.0-1.0>,
  "signals": ["<signal 1>", "<signal 2>"]
}
`.trim()

export async function analyzeVisitor(
  visitorId: string,
  clientId:  string,
  signals:   VisitorSignals,
): Promise<VisitorAvatar> {
  const storage = useStorage('avatars')

  
  const parts: string[] = []

  if (signals.pagesViewed?.length) {
    parts.push(`Pages visitées : ${signals.pagesViewed.join(', ')}`)
  }
  if (signals.utmSource) {
    parts.push(`Source d'acquisition : ${signals.utmSource}`)
  }
  if (signals.formSubject) {
    parts.push(`Sujet formulaire de contact : ${signals.formSubject}`)
  }
  if (signals.formMessageHash) {
    parts.push(`Message soumis (hash SHA-256) : ${signals.formMessageHash}`)
  }

  const userPrompt = parts.length
    ? parts.join('\n')
    : 'Aucun signal disponible.'

  
  let avatar: VisitorAvatar

  try {
    const raw = await callAI(SYSTEM_PROMPT, userPrompt)
    const parsed = JSON.parse(raw) as {
      type:       AvatarType
      label:      string
      confidence: number
      signals:    string[]
    }

    avatar = {
      type:        parsed.type       ?? 'unknown',
      label:       parsed.label      ?? 'Inconnu',
      confidence:  parsed.confidence ?? 0,
      signals:     parsed.signals    ?? [],
      computedAt:  new Date().toISOString(),
      clientId,
      visitorId,
    }
  } catch (err) {
    console.error('[analyze-visitor] Erreur classification IA :', err)
    avatar = {
      type:       'unknown',
      label:      'Inconnu',
      confidence: 0,
      signals:    ['Erreur lors de la classification IA'],
      computedAt: new Date().toISOString(),
      clientId,
      visitorId,
    }
  }

  
  const key = `${clientId}:${visitorId}`
  await storage.setItem(key, avatar)

  return avatar
}
