

import { replyConversation } from '~/server/utils/chatbot-engine'

export default defineEventHandler(async (event) => {
  const body = await readBody(event) as {
    conversationId?:    number | string
    conversationToken?: string
    message?:           string
  }
  const conversationId = Number(body?.conversationId)
  const conversationToken = String(body?.conversationToken || '')
  const message = String(body?.message || '')

  if (!conversationId || !conversationToken) {
    throw createError({ statusCode: 400, statusMessage: 'conversationId + token requis', data: { code: 'CHATBOT_MISSING_PARAMS' } })
  }
  if (!message.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Message vide', data: { code: 'CHATBOT_EMPTY_MESSAGE' } })
  }

  try {
    const dto = await replyConversation({ conversationId, conversationToken, message }, { event })
    
    
    
    return {
      ok: true,
      humanTakeover: Boolean(dto.humanTakeover),
      awaitMoreProduct: Boolean((dto as any).awaitMoreProduct),
      message: {
        nodeKey:  dto.nodeKey,
        type:     dto.type,
        content:  dto.content,
        options:  dto.options,
        terminal: dto.terminal,
        humanTakeover: Boolean(dto.humanTakeover),
        awaitMoreProduct: Boolean((dto as any).awaitMoreProduct),
      },
    }
  } catch (err: any) {
    console.error('[chatbot/reply] ', err?.message)
    throw createError({ statusCode: 400, statusMessage: err?.message || 'Erreur réponse' })
  }
})
