

import { useClientDb } from '~/server/utils/db'
import { persistAnswer, renderQuestionForConversation } from '~/server/utils/chatbot-engine'

export default defineEventHandler(async (event) => {
  const body = await readBody(event) as {
    conversationId?: number | string
    conversationToken?: string
    productId?: number | string
    qty?: number | string
  }
  const conversationId = Number(body?.conversationId)
  const conversationToken = String(body?.conversationToken || '')
  const productId = Number(body?.productId)
  const initialQty = Number(body?.qty || 0)
  if (!conversationId || !conversationToken || !productId) {
    throw createError({ statusCode: 400, statusMessage: 'conversationId + token + productId requis', data: { code: 'CHATBOT_MISSING_PARAMS' } })
  }

  const db = useClientDb(event)
  const conv = await db.get<any>(
    `SELECT id_conversation, status, conversation_token
       FROM cs_main.cs_chatbot_conversation
      WHERE id_conversation = ? LIMIT 1`,
    [conversationId],
  )
  if (!conv) throw createError({ statusCode: 404, statusMessage: 'Conversation introuvable', data: { code: 'CHATBOT_CONVERSATION_NOT_FOUND' } })
  if (String(conv.conversation_token) !== conversationToken) {
    throw createError({ statusCode: 403, statusMessage: 'Token invalide', data: { code: 'CHATBOT_INVALID_TOKEN' } })
  }
  if (conv.status === 'closed') {
    throw createError({ statusCode: 400, statusMessage: 'Conversation déjà clôturée', data: { code: 'CHATBOT_CONVERSATION_CLOSED' } })
  }

  
  
  const skipQty = initialQty > 1
  const startKey = skipQty ? 'product_q2_freq' : 'product_q1_qty'
  await db.run(
    `UPDATE cs_main.cs_chatbot_conversation
        SET product_id_context = ?, current_node_key = ?, date_upd = NOW()
      WHERE id_conversation = ?`,
    [productId, startKey, conversationId],
  )

  if (skipQty) {
    
    await db.run(
      `UPDATE cs_main.cs_chatbot_conversation_product
          SET qty = ?
        WHERE id_conversation = ? AND id_product = ?`,
      [String(initialQty).slice(0, 64), conversationId, productId],
    )
    
    const exists = await db.get<any>(
      `SELECT id_link FROM cs_main.cs_chatbot_conversation_product
        WHERE id_conversation = ? AND id_product = ? LIMIT 1`,
      [conversationId, productId],
    )
    if (!exists) {
      await db.query(
        `INSERT INTO cs_main.cs_chatbot_conversation_product
           (id_conversation, id_product, qty, date_add)
         VALUES (?, ?, ?, NOW())`,
        [conversationId, productId, String(initialQty).slice(0, 64)],
      )
    }
    await db.query(
      `INSERT INTO cs_main.cs_chatbot_message
         (id_conversation, role, content, type, date_add)
       VALUES (?, 'user', ?, 'text', NOW())`,
      [conversationId, `Qté visée : ${initialQty}`],
    )
    const qtyNodeLang = await db.get<any>(
      `SELECT COALESCE(nl.question, '') AS question, COALESCE(nl.recap_label, '') AS recap_label
         FROM cs_main.cs_chatbot_node n
    LEFT JOIN cs_main.cs_chatbot_node_lang nl
           ON nl.id_node = n.id_node AND nl.id_lang = 1
        WHERE n.node_key = 'product_q1_qty' LIMIT 1`,
    )
    await persistAnswer(
      db, conversationId, 'product_q1_qty',
      String(qtyNodeLang?.question || ''),
      qtyNodeLang?.recap_label ? String(qtyNodeLang.recap_label) : null,
      String(initialQty), 1,
    )
  }

  
  const node = await db.get<any>(
    `SELECT n.node_key, n.type, COALESCE(nl.question, '') AS question
       FROM cs_main.cs_chatbot_node n
  LEFT JOIN cs_main.cs_chatbot_node_lang nl
         ON nl.id_node = n.id_node AND nl.id_lang = 1
      WHERE n.node_key = ? LIMIT 1`,
    [startKey],
  )
  
  
  
  const rawQuestion = String(node?.question || 'À quelle fréquence ?')
  const question = await renderQuestionForConversation(conversationId, rawQuestion, { event }, 1)
    .catch(() => rawQuestion)
  
  let options: string[] = []
  if (String(node?.type || 'text') === 'buttons') {
    const rows = await db.query<any>(
      `SELECT ol.label_text
         FROM cs_main.cs_chatbot_option o
         JOIN cs_main.cs_chatbot_node n ON n.id_node = o.id_node
    LEFT JOIN cs_main.cs_chatbot_option_lang ol
           ON ol.id_option = o.id_option AND ol.id_lang = 1
        WHERE n.node_key = ? ORDER BY o.position ASC`,
      [startKey],
    ) as any[]
    options = rows.map((r) => String(r.label_text || ''))
  }
  await db.query(
    `INSERT INTO cs_main.cs_chatbot_message
       (id_conversation, role, content, type, options_json, date_add)
     VALUES (?, 'bot', ?, ?, ?, NOW())`,
    [conversationId, question, node?.type || 'text', options.length ? JSON.stringify(options) : null],
  )

  return {
    ok: true,
    nodeKey: startKey,
    type:    String(node?.type || 'text'),
    content: question.replace(/\|NL\|/g, '\n'),
    options,
    terminal: false,
  }
})
