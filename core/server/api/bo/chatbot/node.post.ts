

import { useClientDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    nodeKey: string
    type: string
    capture?: string | null
    nextQuestion?: string | null
    terminal?: boolean | number
    scenarioRoot?: string | null
    position?: number
    langs?: { idLang: number; question: string; recapLabel?: string | null }[]
  }>(event)

  if (!body?.nodeKey || !body?.type) {
    throw createError({ statusCode: 400, message: 'nodeKey et type requis' })
  }
  const validType = ['buttons', 'text'].includes(body.type)
  if (!validType) throw createError({ statusCode: 400, message: 'type doit être buttons ou text' })

  const db = useClientDb(event)

  
  const existing = await db.query<{ id_node: number }>(
    `SELECT id_node FROM cs_chatbot_node WHERE node_key = ? LIMIT 1`,
    [body.nodeKey],
  )
  if (existing.length) {
    throw createError({ statusCode: 409, message: `node_key "${body.nodeKey}" existe déjà` })
  }

  
  const inserted = await db.query<{ id_node: number }>(
    `INSERT INTO cs_chatbot_node
       (node_key, type, capture, next_question, terminal, scenario_root, position, date_add, date_upd)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
     RETURNING id_node`,
    [
      body.nodeKey,
      body.type,
      body.capture || null,
      body.nextQuestion || null,
      body.terminal ? 1 : 0,
      body.scenarioRoot || null,
      body.position ?? 0,
    ],
  )
  const idNode = Number(inserted[0]?.id_node)
  if (!idNode) throw createError({ statusCode: 500, message: 'Insert node échoué' })

  
  const langs = body.langs?.length ? body.langs : [{ idLang: 1, question: '', recapLabel: null }]
  for (const l of langs) {
    await db.run(
      `INSERT INTO cs_chatbot_node_lang (id_node, id_lang, question, recap_label)
       VALUES (?, ?, ?, ?)`,
      [idNode, l.idLang || 1, l.question || '', l.recapLabel || null],
    )
  }

  return { ok: true, idNode }
})
