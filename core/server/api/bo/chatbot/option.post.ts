/**
 *
 * POST /api/bo/chatbot/option — Creates an option + its translations.
 * Body : { idNode, position?, nextNodeKey, langs: [{ idLang, labelText }] }
 */
import { useClientDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    idNode: number
    position?: number
    nextNodeKey: string
    langs?: { idLang: number; labelText: string }[]
  }>(event)

  if (!body?.idNode || !body?.nextNodeKey) {
    throw createError({ statusCode: 400, message: 'idNode + nextNodeKey requis' })
  }

  const db = useClientDb(event)

  // Vérifie que le parent + la cible existent
  const parent = await db.query<any>(`SELECT id_node FROM cs_chatbot_node WHERE id_node = ?`, [body.idNode])
  if (!parent.length) throw createError({ statusCode: 404, message: 'Parent node introuvable' })
  const target = await db.query<any>(`SELECT node_key FROM cs_chatbot_node WHERE node_key = ?`, [body.nextNodeKey])
  if (!target.length) throw createError({ statusCode: 400, message: `nextNodeKey "${body.nextNodeKey}" introuvable` })

  const inserted = await db.query<{ id_option: number }>(
    `INSERT INTO cs_chatbot_option (id_node, position, next_node_key)
     VALUES (?, ?, ?)
     RETURNING id_option`,
    [body.idNode, body.position ?? 1, body.nextNodeKey],
  )
  const idOption = Number(inserted[0]?.id_option)
  if (!idOption) throw createError({ statusCode: 500, message: 'Insert option échoué' })

  const langs = body.langs?.length ? body.langs : [{ idLang: 1, labelText: '' }]
  for (const l of langs) {
    await db.run(
      `INSERT INTO cs_chatbot_option_lang (id_option, id_lang, label_text)
       VALUES (?, ?, ?)`,
      [idOption, l.idLang || 1, l.labelText || ''],
    )
  }

  return { ok: true, idOption }
})
