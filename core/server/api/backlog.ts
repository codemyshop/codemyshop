/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * /api/backlog
 * GET    → lists items (filters: status, priority, category, day, view)
 * POST   → creates an item (body JSON)
 * PUT    → updates an item (body: { id_item, ...fields })
 * DELETE → deletes an item (body: { id_item } or query ?id_item=)
 *
 * Single source: cs_backlog (production database) via ac_backlog facade. No caching.
 */

import {
  type BacklogUpdateSet,
  createBacklogItem,
  deleteBacklogItem,
  listBacklogItems,
  updateBacklogItem,
} from '~/internal/backlog/server/utils/backlog'

const PRIORITIES = ['P0', 'P1', 'P2', 'P3'] as const
const STATUSES   = ['backlog', 'planned', 'in_progress', 'done', 'cancelled'] as const
const CATEGORIES = ['produit', 'infra', 'contenu', 'strategie', 'commercial', 'client'] as const
const DAYS       = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'] as const

function valid<T extends readonly string[]>(value: any, allowed: T, fallback: T[number] | null = null): T[number] | null {
  return (allowed as readonly string[]).includes(value) ? value : fallback
}

function formatRow(r: any) {
  return {
    idItem:      r.id_item,
    title:       r.title,
    description: r.description,
    category:    r.category,
    priority:    r.priority,
    status:      r.status,
    targetDay:   r.target_day,
    targetDate:  r.target_date ? (r.target_date instanceof Date ? r.target_date.toISOString().slice(0, 10) : String(r.target_date).slice(0, 10)) : null,
    assignedTo:  r.assigned_to,
    clientId:    r.client_id,
    notes:       r.notes,
    dateAdd:     r.date_add,
    dateUpd:     r.date_upd,
  }
}

export default defineEventHandler(async (event) => {
  const method = event.method

  try {
    if (method === 'GET') {
      const q = getQuery(event)
      const rows = await listBacklogItems({
        view: q.view ? String(q.view) : '',
        status: q.status ? String(q.status) : undefined,
        priority: q.priority && valid(q.priority, PRIORITIES) ? String(q.priority) : undefined,
        category: q.category && valid(q.category, CATEGORIES) ? String(q.category) : undefined,
        day: q.day && valid(q.day, DAYS) ? String(q.day) : undefined,
      })
      return { success: true, items: rows.map(formatRow), count: rows.length }
    }

    if (method === 'POST') {
      const body = await readBody(event) || {}
      const title = String(body.title || '').trim()
      if (!title) { setResponseStatus(event, 400); return { success: false, error: 'title requis' } }

      const idItem = await createBacklogItem({
        title,
        description: body.description ?? null,
        category:    valid(body.category, CATEGORIES, 'produit')!,
        priority:    valid(body.priority, PRIORITIES, 'P2')!,
        status:      valid(body.status,   STATUSES,   'backlog')!,
        target_day:  body.target_day ? valid(body.target_day, DAYS) : null,
        target_date: body.target_date || null,
        client_id:   body.client_id || null,
        assigned_to: body.assigned_to || 'atlas',
        notes:       body.notes ?? null,
      })
      return { success: true, idItem }
    }

    if (method === 'PUT') {
      const body = await readBody(event) || {}
      const id = Number(body.id_item || body.idItem || 0)
      if (!id) { setResponseStatus(event, 400); return { success: false, error: 'id_item requis' } }

      const allowed = {
        title:       'string',
        description: 'string',
        category:    CATEGORIES,
        priority:    PRIORITIES,
        status:      STATUSES,
        target_day:  DAYS,
        target_date: 'date',
        client_id:   'string',
        assigned_to: 'string',
        notes:       'string',
      } as const

      const sets: BacklogUpdateSet[] = []
      for (const [field, rule] of Object.entries(allowed)) {
        const camel = field === 'id_item' ? null : field.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
        const v = (camel && body[camel] !== undefined) ? body[camel] : body[field]
        if (v === undefined) continue

        if (v === null || v === '' || v === '__null__') {
          sets.push({ kind: 'null', column: field })
          continue
        }
        if (Array.isArray(rule)) {
          if (!(rule as readonly string[]).includes(v)) continue
          sets.push({ kind: 'value', column: field, value: v })
        } else {
          sets.push({ kind: 'value', column: field, value: v })
        }
      }
      if (!sets.length) { setResponseStatus(event, 400); return { success: false, error: 'aucun champ' } }

      await updateBacklogItem(id, sets)
      return { success: true, idItem: id, updated: sets.length }
    }

    if (method === 'DELETE') {
      const q = getQuery(event)
      const body = await readBody(event).catch(() => ({}))
      const id = Number((body as any)?.id_item || (body as any)?.idItem || q.id_item || 0)
      if (!id) { setResponseStatus(event, 400); return { success: false, error: 'id_item requis' } }

      await deleteBacklogItem(id)
      return { success: true, idItem: id }
    }

    setResponseStatus(event, 405)
    return { success: false, error: 'method not allowed' }
  } catch (err: any) {
    console.error('[API backlog] error:', err.message)
    setResponseStatus(event, 500)
    return { success: false, error: err.message || 'DB error' }
  }
})
