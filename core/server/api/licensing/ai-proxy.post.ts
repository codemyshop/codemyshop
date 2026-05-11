

import { timingSafeEqual } from 'node:crypto'
import { watermarkResponse } from '~/server/licensing/watermark'

const PROMPT_LIBRARY: Record<string, string> = {
  broadcast: `Tu es un expert copywriter email marketing.
Génère un message structuré en JSON : { "subject": "...", "preview": "...", "body": "...", "cta": "..." }`,

  nurturing: `Tu es un expert en séquences de nurturing e-commerce.
Génère une séquence en JSON avec un tableau "steps" : [{ "dayOffset": N, "channel": "email"|"whatsapp", "subject": "...", "body": "...", "goal": "..." }]`,

  transcreation: `Tu es un expert en transcréation marketing multilingue.
Adapte le message à la psychologie d'achat du marché cible.
JSON : { "transcreated": "...", "culturalNotes": [...], "adaptations": [...] }`,

  youtube: `Tu es un producteur de vidéos YouTube B2B.
Génère un storyboard en JSON avec "scenes" : [{ "sceneNumber": N, "voiceOver": "...", "visual_Prompt_Pixar3D": "3D Pixar style, ..., 16:9", "bRoll_Text": "..." }]`,

  'growth-advice': `Tu es un consultant en croissance e-commerce.
Propose 3 actions pragmatiques en JSON : { "summary": "...", "actions": [{ "title": "...", "channel": "...", "impact": "...", "detail": "..." }] }`,

  'feedback-to-prompt': `Tu es un Product Manager technique expert Nuxt 3 / Nitro / PrestaShop.
Traduis la demande client en prompt Claude Code structuré.
JSON : { "aiClassification": "...", "technicalPrompt": "...", "estimatedComplexity": "..." }`,
}

export default defineEventHandler(async (event) => {
  
  const auth = (getHeader(event, 'authorization') ?? '').replace(/^Bearer\s+/i, '')
  const secret = process.env.MASTER_WEBHOOK_SECRET ?? ''
  if (!secret || !auth || !safeCompare(auth, secret)) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const body = await readBody<{
    clientId:  string
    taskType:  string
    variables: Record<string, any>
  }>(event)

  const clientId = (body.clientId ?? '').trim()
  const taskType = (body.taskType ?? '').trim()

  if (!clientId || !taskType) {
    throw createError({ statusCode: 400, message: 'clientId et taskType requis' })
  }

  
  const systemPrompt = PROMPT_LIBRARY[taskType]
  if (!systemPrompt) {
    throw createError({ statusCode: 400, message: `taskType inconnu : ${taskType}` })
  }

  
  const userPrompt = Object.entries(body.variables)
    .map(([k, v]) => `${k}: ${typeof v === 'string' ? v.slice(0, 500) : JSON.stringify(v).slice(0, 500)}`)
    .join('\n')

  try {
    
    const raw = await callAI(systemPrompt, userPrompt)

    if (!raw || raw.startsWith('[STUB]')) {
      return { ok: true, result: raw, watermark: null }
    }

    
    const { text, watermark } = watermarkResponse(raw, clientId, taskType)

    
    console.log(`[ai-proxy] ${clientId}/${taskType} — watermark:${watermark}`)

    return { ok: true, result: text, watermark }
  } catch (err: any) {
    console.error(`[ai-proxy] ${clientId}/${taskType} error:`, err?.message)
    return { ok: false, result: null, error: err?.message }
  }
})

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  try { return timingSafeEqual(Buffer.from(a), Buffer.from(b)) }
  catch { return false }
}
