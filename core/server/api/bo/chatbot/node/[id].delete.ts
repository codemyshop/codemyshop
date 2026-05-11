

import { useClientDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const idNode = Number(getRouterParam(event, 'id'))
  if (!idNode || isNaN(idNode)) throw createError({ statusCode: 400, message: 'id invalide' })

  const db = useClientDb(event)

  
  const node = await db.query<{ node_key: string }>(
    `SELECT node_key FROM cs_chatbot_node WHERE id_node = ?`,
    [idNode],
  )
  if (!node.length) throw createError({ statusCode: 404, message: 'Node introuvable' })
  const nodeKey = node[0].node_key

  
  const refByConv = await db.query<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM cs_chatbot_conversation
      WHERE current_node_key = ? AND status != 'closed'`,
    [nodeKey],
  )
  if (Number(refByConv[0]?.n) > 0) {
    throw createError({
      statusCode: 409,
      message: `${refByConv[0].n} conversation(s) active(s) sont sur ce node — fermez-les avant suppression.`,
    })
  }

  const refByOption = await db.query<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM cs_chatbot_option WHERE next_node_key = ?`,
    [nodeKey],
  )
  if (Number(refByOption[0]?.n) > 0) {
    throw createError({
      statusCode: 409,
      message: `${refByOption[0].n} option(s) pointent vers ce node — modifiez-les avant suppression.`,
    })
  }

  const refByNext = await db.query<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM cs_chatbot_node WHERE next_question = ?`,
    [nodeKey],
  )
  if (Number(refByNext[0]?.n) > 0) {
    throw createError({
      statusCode: 409,
      message: `${refByNext[0].n} autre(s) node(s) ont next_question pointant vers celui-ci — modifiez-les avant suppression.`,
    })
  }

  
  await db.run(
    `DELETE FROM cs_chatbot_option_lang
      WHERE id_option IN (SELECT id_option FROM cs_chatbot_option WHERE id_node = ?)`,
    [idNode],
  )
  await db.run(`DELETE FROM cs_chatbot_option WHERE id_node = ?`, [idNode])
  await db.run(`DELETE FROM cs_chatbot_node_lang WHERE id_node = ?`, [idNode])
  await db.run(`DELETE FROM cs_chatbot_node WHERE id_node = ?`, [idNode])

  return { ok: true, idNode }
})
