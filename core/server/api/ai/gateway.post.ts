

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
