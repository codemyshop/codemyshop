/**
 *
 * PUT /api/bo/chatbot/option/:id — Update option + UPSERT translations.
 */
import { useClientDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const idOption = Number(getRouterParam(event, 'id'))
  if (!idOption || isNaN(idOption)) throw createError({ statusCode: 400, message: 'id invalide' })

  const body = await readBody<{
    position?: number
    nextNodeKey?: string
    langs?: { idLang: number; labelText: string }[]
  }>(event)
  if (!body) throw createError({ statusCode: 400, message: 'body requis' })

  const db = useClientDb(event)

  if (body.nextNodeKey !== undefined) {
    const target = await db.query<any>(`SELECT node_key FROM cs_chatbot_node WHERE node_key = ?`, [body.nextNodeKey])
    if (!target.length) throw createError({ statusCode: 400, message: `nextNodeKey "${body.nextNodeKey}" introuvable` })
  }

  const sets: string[] = []
  const params: any[] = []
  if (body.position !== undefined) { sets.push('position = ?'); params.push(body.position) }
  if (body.nextNodeKey !== undefined) { sets.push('next_node_key = ?'); params.push(body.nextNodeKey) }

  if (sets.length) {
    await db.run(
      `UPDATE cs_chatbot_option SET ${sets.join(', ')} WHERE id_option = ?`,
      [...params, idOption],
    )
  }

  if (body.langs?.length) {
    for (const l of body.langs) {
      await db.run(
        `INSERT INTO cs_chatbot_option_lang (id_option, id_lang, label_text)
           VALUES (?, ?, ?)
         ON CONFLICT (id_option, id_lang)
         DO UPDATE SET label_text = EXCLUDED.label_text`,
        [idOption, l.idLang || 1, l.labelText || ''],
      )
    }
  }

  return { ok: true, idOption }
})
