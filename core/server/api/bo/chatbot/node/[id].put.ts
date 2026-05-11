

import { useClientDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const idNode = Number(getRouterParam(event, 'id'))
  if (!idNode || isNaN(idNode)) throw createError({ statusCode: 400, message: 'id invalide' })

  const body = await readBody<{
    nodeKey?: string
    type?: string
    capture?: string | null
    nextQuestion?: string | null
    terminal?: boolean | number
    scenarioRoot?: string | null
    position?: number
    langs?: { idLang: number; question: string; recapLabel?: string | null }[]
  }>(event)
  if (!body) throw createError({ statusCode: 400, message: 'body requis' })

  const db = useClientDb(event)

  
  const sets: string[] = []
  const params: any[] = []
  if (body.nodeKey !== undefined) { sets.push('node_key = ?'); params.push(body.nodeKey) }
  if (body.type !== undefined) {
    if (!['buttons', 'text'].includes(body.type)) throw createError({ statusCode: 400, message: 'type invalide' })
    sets.push('type = ?'); params.push(body.type)
  }
  if (body.capture !== undefined) { sets.push('capture = ?'); params.push(body.capture || null) }
  if (body.nextQuestion !== undefined) { sets.push('next_question = ?'); params.push(body.nextQuestion || null) }
  if (body.terminal !== undefined) { sets.push('terminal = ?'); params.push(body.terminal ? 1 : 0) }
  if (body.scenarioRoot !== undefined) { sets.push('scenario_root = ?'); params.push(body.scenarioRoot || null) }
  if (body.position !== undefined) { sets.push('position = ?'); params.push(body.position) }
  sets.push('date_upd = NOW()')

  if (sets.length > 1) {
    await db.run(
      `UPDATE cs_chatbot_node SET ${sets.join(', ')} WHERE id_node = ?`,
      [...params, idNode],
    )
  }

  
  if (body.langs?.length) {
    for (const l of body.langs) {
      await db.run(
        `INSERT INTO cs_chatbot_node_lang (id_node, id_lang, question, recap_label)
           VALUES (?, ?, ?, ?)
         ON CONFLICT (id_node, id_lang)
         DO UPDATE SET question = EXCLUDED.question, recap_label = EXCLUDED.recap_label`,
        [idNode, l.idLang || 1, l.question || '', l.recapLabel || null],
      )
    }
  }

  return { ok: true, idNode }
})
