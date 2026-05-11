

import { useClientDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const q = getQuery(event) as Record<string, string>
  const conversationId = Number(q.conversationId)
  const token = String(q.token || '')
  if (!conversationId || !token) {
    throw createError({ statusCode: 400, statusMessage: 'conversationId + token requis', data: { code: 'CHATBOT_MISSING_PARAMS' } })
  }

  const db = useClientDb(event)
  const conv = await db.get<any>(
    `SELECT id_conversation, status, current_node_key, scenario_root, product_id_context,
            human_takeover, id_employee
       FROM cs_main.cs_chatbot_conversation
      WHERE id_conversation = ? AND conversation_token = ? LIMIT 1`,
    [conversationId, token],
  )
  if (!conv) throw createError({ statusCode: 404, statusMessage: 'Conversation introuvable', data: { code: 'CHATBOT_CONVERSATION_NOT_FOUND' } })

  const messages = await db.query<any>(
    `SELECT role, content, type, options_json
       FROM cs_main.cs_chatbot_message
      WHERE id_conversation = ? ORDER BY id_message ASC`,
    [conversationId],
  ) as any[]

  
  
  let agentFirstname = ''
  if (conv.human_takeover && conv.id_employee) {
    const emp = await db.get<any>(
      `SELECT firstname FROM cs_main.ps_employee WHERE id_employee = ? LIMIT 1`,
      [Number(conv.id_employee)],
    )
    agentFirstname = String(emp?.firstname || '').trim()
  }

  const products = await db.query<any>(
    `SELECT id_product, qty, freq, target_price
       FROM cs_main.cs_chatbot_conversation_product
      WHERE id_conversation = ? ORDER BY id_link ASC`,
    [conversationId],
  ) as any[]

  
  
  
  let currentType: 'buttons' | 'text' = 'text'
  let currentOptions: string[] = []
  if (conv.current_node_key) {
    const node = await db.get<any>(
      `SELECT type FROM cs_main.cs_chatbot_node WHERE node_key = ? LIMIT 1`,
      [String(conv.current_node_key)],
    )
    if (node?.type === 'buttons') {
      currentType = 'buttons'
      const opts = await db.query<any>(
        `SELECT ol.label_text
           FROM cs_main.cs_chatbot_option o
           JOIN cs_main.cs_chatbot_node n ON n.id_node = o.id_node
      LEFT JOIN cs_main.cs_chatbot_option_lang ol
             ON ol.id_option = o.id_option AND ol.id_lang = 1
          WHERE n.node_key = ? ORDER BY o.position ASC`,
        [String(conv.current_node_key)],
      ) as any[]
      currentOptions = opts.map((r) => String(r.label_text || ''))
    }
  }

  return {
    ok: true,
    open:    String(conv.status) === 'open',
    scenario: String(conv.scenario_root || 'global'),
    productIdContext: conv.product_id_context || null,
    currentNodeKey:   String(conv.current_node_key || ''),
    currentType,
    currentOptions,
    humanTakeover: Boolean(conv.human_takeover),
    agentFirstname,
    messages: messages.map((m) => ({
      role:    m.role,
      content: String(m.content || ''),
      type:    String(m.type || 'text'),
    })),
    products,
  }
})
