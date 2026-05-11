

import { startConversation } from '~/server/utils/chatbot-engine'

export default defineEventHandler(async (event) => {
  const body = await readBody(event) as { scenario?: string; productId?: number; qty?: number }
  const ipAddress = getRequestHeader(event, 'cf-connecting-ip')
    || getRequestHeader(event, 'x-real-ip')
    || (getRequestIP(event, { xForwardedFor: true }) || '')
  const userAgent = getRequestHeader(event, 'user-agent') || ''

  try {
    const dto = await startConversation({
      scenario:   body?.scenario,
      productId:  body?.productId ? Number(body.productId) : null,
      initialQty: body?.qty ? Number(body.qty) : null,
      ipAddress,
      userAgent,
    }, { event })
    return {
      ok: true,
      conversationId:    dto.conversationId,
      conversationToken: dto.conversationToken,
      message: {
        nodeKey:  dto.nodeKey,
        type:     dto.type,
        content:  dto.content,
        options:  dto.options,
        terminal: dto.terminal,
      },
    }
  } catch (err: any) {
    console.error('[chatbot/start] ', err?.message)
    throw createError({ statusCode: 500, statusMessage: err?.message || 'Erreur démarrage' })
  }
})
