/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'
import { persistAnswer, renderQuestionForConversation } from '~/server/utils/chatbot-engine'

/**
 * POST /api/chatbot/add-product — adds a new product to an already
 * open conversation. Used when the user navigates to another product after clicking
 * "Add another product".
 *
 * Body { conversationId, conversationToken, productId }
 *
 * Effets :
 * - update product_id_context (the current context for the captures
 * `product_*` that follow)
 * - reset current_node_key = 'product_q1_qty' to restart the flow
 *     produit
 * - push an introductory bot message "What quantity for this product…"
 *
 * The front reopens the widget after the call and re-runs startConversation
 * to fetch the current node.
 */
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

  // Si qty pré-saisie > 1 → skip product_q1_qty, on persiste qté + on
  // démarre directement sur product_q2_freq (label fréquence).
  const skipQty = initialQty > 1
  const startKey = skipQty ? 'product_q2_freq' : 'product_q1_qty'
  await db.run(
    `UPDATE cs_main.cs_chatbot_conversation
        SET product_id_context = ?, current_node_key = ?, date_upd = NOW()
      WHERE id_conversation = ?`,
    [productId, startKey, conversationId],
  )

  if (skipQty) {
    // Persiste la qty + trace côté timeline + answer (récap)
    await db.run(
      `UPDATE cs_main.cs_chatbot_conversation_product
          SET qty = ?
        WHERE id_conversation = ? AND id_product = ?`,
      [String(initialQty).slice(0, 64), conversationId, productId],
    )
    // Si pas de row encore, on insère
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

  // Lit la question du node de départ
  const node = await db.get<any>(
    `SELECT n.node_key, n.type, COALESCE(nl.question, '') AS question
       FROM cs_main.cs_chatbot_node n
  LEFT JOIN cs_main.cs_chatbot_node_lang nl
         ON nl.id_node = n.id_node AND nl.id_lang = 1
      WHERE n.node_key = ? LIMIT 1`,
    [startKey],
  )
  // Rend les placeholders dynamiques ({{PRODUCT_NAME}} pour product_q1_qty).
  // Le product_id_context vient d'être maj juste au-dessus, donc le helper
  // pioche bien le nouveau produit.
  const rawQuestion = String(node?.question || 'À quelle fréquence ?')
  const question = await renderQuestionForConversation(conversationId, rawQuestion, { event }, 1)
    .catch(() => rawQuestion)
  // Pour 'buttons', on doit retourner les options
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
