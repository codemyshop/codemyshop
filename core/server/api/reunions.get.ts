

import { listActiveReunions } from '~/internal/reunions/server/utils/reunions'

export default defineEventHandler(async () => {
  try {
    const rows = await listActiveReunions()
    const reunions = rows.map((r) => ({
      key: r.key_name,
      emoji: r.emoji,
      nom: r.nom,
      quand: r.quand,
      objectif: r.objectif,
      participants: safeJson(r.participants) ?? [],
      duree: r.duree,
      decision: r.decision,
    }))
    return { reunions }
  } catch (err: any) {
    console.error('[API reunions] DB error:', err.message)
    return { reunions: [], error: 'DB unavailable' }
  }
})

function safeJson(str: string | null): any {
  if (!str) return null
  try { return JSON.parse(str) } catch { return null }
}
