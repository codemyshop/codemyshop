

import { randomUUID } from 'node:crypto'
import { timingSafeEqual } from 'node:crypto'

export default defineEventHandler(async (event) => {
  
  const authHeader = getHeader(event, 'authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '')

  const secret = process.env.MASTER_WEBHOOK_SECRET ?? ''
  if (!secret) {
    throw createError({ statusCode: 503, message: 'Webhook non configuré (MASTER_WEBHOOK_SECRET absent)' })
  }

  if (!token || !safeCompare(token, secret)) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  
  const body = await readBody<{
    clientId:     string
    clientName:   string
    feedbackType: string
    message:      string
    priority:     string
    originUrl?:   string
  }>(event)

  
  const clientId     = (body.clientId ?? '').trim().slice(0, 50)
  const clientName   = (body.clientName ?? '').trim().slice(0, 100)
  const feedbackType = (['feature', 'improvement', 'bug'].includes(body.feedbackType) ? body.feedbackType : 'feature') as 'feature' | 'improvement' | 'bug'
  const message      = (body.message ?? '').trim().slice(0, 2000)
  const priority     = (['low', 'medium', 'high'].includes(body.priority) ? body.priority : 'medium') as 'low' | 'medium' | 'high'

  if (!clientId || !message) {
    throw createError({ statusCode: 400, message: 'clientId et message requis' })
  }

  
  const item: FeedbackItem = {
    id:          randomUUID(),
    clientId,
    clientName:  clientName || clientId,
    type:        feedbackType,
    description: message,
    priority,
    status:      'pending',
    createdAt:   new Date().toISOString(),
    updatedAt:   new Date().toISOString(),
  }

  const all = await readFeedbacks()
  all.unshift(item)
  await writeFeedbacks(all)

  
  generatePromptAsync(item).catch(err =>
    console.error('[webhook] AI analysis failed:', err?.message)
  )

  console.log(`[webhook] Feedback reçu de ${clientName} (${clientId}): ${feedbackType} — ${message.slice(0, 60)}...`)

  return { ok: true, feedbackId: item.id }
})

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b))
  } catch {
    return false
  }
}

async function generatePromptAsync(fb: FeedbackItem) {
  try {
    const typeLabel = fb.type === 'bug' ? 'Bug report' : fb.type === 'improvement' ? 'Amélioration' : 'Nouvelle fonctionnalité'

    const systemPrompt = `Tu es un Product Manager technique expert Nuxt 3 / Nitro / PrestaShop Headless.
Traduis cette demande client en prompt Claude Code structuré avec /plan et fichiers ciblés.
RÉPONDS en JSON : { "aiClassification": "...", "technicalPrompt": "...", "estimatedComplexity": "..." }`

    const userPrompt = `Type : ${typeLabel}\nDescription : ${fb.description}\nClient : ${fb.clientId}`

    const raw = await callAI(systemPrompt, userPrompt)
    if (!raw || raw.startsWith('[STUB]')) return

    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return

    const parsed = JSON.parse(match[0])

    
    const all = await readFeedbacks()
    const idx = all.findIndex(f => f.id === fb.id)
    if (idx >= 0) {
      all[idx].aiClassification   = String(parsed.aiClassification ?? '').slice(0, 200)
      all[idx].technicalPrompt    = String(parsed.technicalPrompt ?? '').slice(0, 5000)
      all[idx].estimatedComplexity = String(parsed.estimatedComplexity ?? '').slice(0, 100)
      all[idx].status             = 'todo'
      all[idx].updatedAt          = new Date().toISOString()
      await writeFeedbacks(all)
    }
  } catch {  }
}
