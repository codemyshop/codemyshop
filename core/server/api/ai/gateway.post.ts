/**
 *
 * POST /api/ai/gateway
 * Body: { prompt, systemPrompt?, clientId?, provider?, model?, maxTokens?, temperature? }
 *
 * HTTP endpoint for the AI Gateway — allows the Python cron
 * to call the correct AI provider without direct dependency.
 */
import { generateContent, resolveClientAI } from '../../services/ai-gateway'
import type { AIProvider } from '../../services/ai-gateway'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    prompt: string
    systemPrompt?: string
    clientId?: string
    provider?: AIProvider
    model?: string
    maxTokens?: number
    temperature?: number
  }>(event)

  if (!body.prompt) {
    throw createError({ statusCode: 400, message: 'prompt requis' })
  }

  // Résoudre le provider depuis la config client si pas explicite
  const clientAI = body.clientId ? await resolveClientAI(body.clientId) : null

  const result = await generateContent({
    prompt:       body.prompt,
    systemPrompt: body.systemPrompt,
    provider:     body.provider ?? clientAI?.provider ?? 'mistral',
    model:        body.model ?? clientAI?.model,
    maxTokens:    body.maxTokens ?? 4096,
    temperature:  body.temperature ?? 0.7,
  })

  return result
})
