

import { useClientDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, message: 'ID transporteur requis' })

  const body = await readBody<{
    name?: string
    active?: boolean
    delay?: string
    maxWeight?: number
    isFree?: boolean
  }>(event)

  const db = useClientDb(event)

  
  const carrier = await db.get<any>('SELECT id_carrier FROM ps_carrier WHERE id_carrier = ? AND deleted = 0', [id])
  if (!carrier) throw createError({ statusCode: 404, message: 'Transporteur introuvable' })

  
  const sets: string[] = []
  const params: any[] = []

  if (body.name !== undefined) { sets.push('name = ?'); params.push(body.name.trim()) }
  if (body.active !== undefined) { sets.push('active = ?'); params.push(body.active ? 1 : 0) }
  if (body.maxWeight !== undefined) { sets.push('max_weight = ?'); params.push(body.maxWeight) }
  if (body.isFree !== undefined) { sets.push('is_free = ?'); params.push(body.isFree ? 1 : 0) }

  if (sets.length) {
    params.push(id)
    await db.run(`UPDATE ps_carrier SET ${sets.join(', ')} WHERE id_carrier = ?`, params)
  }

  
  if (body.delay !== undefined) {
    await db.run('UPDATE ps_carrier_lang SET delay = ? WHERE id_carrier = ?', [body.delay.trim(), id])
  }

  return { success: true }
})
