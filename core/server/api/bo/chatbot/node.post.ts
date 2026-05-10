/**
 *
 * POST /api/bo/chatbot/node — Creates a node + its translations FR/EN/DE.
 * Body : { nodeKey, type, capture?, nextQuestion?, terminal?, scenarioRoot?, position?,
 *          langs: [{ idLang, question, recapLabel? }] }
 */
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

  // Check unicité node_key
  const existing = await db.query<{ id_node: number }>(
    `SELECT id_node FROM cs_chatbot_node WHERE node_key = ? LIMIT 1`,
    [body.nodeKey],
  )
  if (existing.length) {
    throw createError({ statusCode: 409, message: `node_key "${body.nodeKey}" existe déjà` })
  }

  // INSERT node — RETURNING id_node explicit (cf incidents db.run/RETURNING 2026-05-02)
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

  // INSERT _lang (FR=1 par défaut si rien fourni)
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
