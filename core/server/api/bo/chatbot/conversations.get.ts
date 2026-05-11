

import { useClientDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const q = getQuery(event) as Record<string, string>
  const page    = Math.max(1, Number(q.page || 1))
  const perPage = Math.min(200, Math.max(1, Number(q.perPage || 50)))
  const status   = ['open', 'closed', 'all'].includes(q.status || '') ? q.status : 'open'
  const takeover = ['1', '0', 'all'].includes(q.takeover || '') ? q.takeover : 'all'
  const scenario = ['global', 'product', 'order', 'human', 'all'].includes(q.scenario || '') ? q.scenario : 'all'
  const search   = (q.search || '').trim()

  const db = useClientDb(event)
  const where: string[] = []
  const params: any[] = []

  if (status !== 'all')   { where.push(`c.status = ?`);            params.push(status) }
  if (takeover !== 'all') { where.push(`c.human_takeover = ?`);    params.push(takeover === '1') }
  if (scenario !== 'all') { where.push(`c.scenario_root = ?`);     params.push(scenario) }
  if (search) {
    where.push(`(
      c.conversation_token ILIKE ?
      OR c.captured_email ILIKE ?
      OR c.captured_firstname ILIKE ?
      OR c.captured_lastname ILIKE ?
      OR c.captured_company ILIKE ?
    )`)
    const like = `%${search}%`
    params.push(like, like, like, like, like)
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
  const offset = (page - 1) * perPage

  
  const rows = await db.query<any>(
    `SELECT c.id_conversation, c.conversation_token, c.scenario_root,
            c.status, c.human_takeover, c.unread_for_admin,
            c.captured_firstname, c.captured_lastname, c.captured_email,
            c.captured_company, c.captured_phone,
            c.product_id_context, c.id_employee, c.id_smartlead,
            c.last_message_at, c.date_add, c.date_upd,
            lm.content AS last_message_content,
            lm.role    AS last_message_role
       FROM cs_main.cs_chatbot_conversation c
       LEFT JOIN LATERAL (
         SELECT content, role
           FROM cs_main.cs_chatbot_message
          WHERE id_conversation = c.id_conversation
          ORDER BY id_message DESC LIMIT 1
       ) lm ON TRUE
       ${whereSql}
   ORDER BY c.last_message_at DESC NULLS LAST, c.id_conversation DESC
      LIMIT ${perPage} OFFSET ${offset}`,
    params,
  ) as any[]

  const totalRow = await db.get<any>(
    `SELECT COUNT(*)::int AS n FROM cs_main.cs_chatbot_conversation c ${whereSql}`,
    params,
  )
  const total = Number(totalRow?.n || 0)

  
  const counts = await db.get<any>(
    `SELECT
        COUNT(*) FILTER (WHERE status = 'open' AND human_takeover = FALSE)::int AS bot_open,
        COUNT(*) FILTER (WHERE status = 'open' AND human_takeover = TRUE)::int  AS takeover_open,
        COUNT(*) FILTER (WHERE status = 'closed')::int                          AS closed,
        COUNT(*) FILTER (WHERE unread_for_admin = TRUE)::int                    AS unread
       FROM cs_main.cs_chatbot_conversation`,
  )

  return {
    ok: true,
    page, perPage, total,
    counts: {
      botOpen:      Number(counts?.bot_open || 0),
      takeoverOpen: Number(counts?.takeover_open || 0),
      closed:       Number(counts?.closed || 0),
      unread:       Number(counts?.unread || 0),
    },
    items: rows.map((r) => ({
      idConversation:    Number(r.id_conversation),
      token:             String(r.conversation_token),
      scenario:          String(r.scenario_root || 'global'),
      status:            String(r.status),
      humanTakeover:     Boolean(r.human_takeover),
      unreadForAdmin:    Boolean(r.unread_for_admin),
      capturedFirstname: r.captured_firstname || '',
      capturedLastname:  r.captured_lastname || '',
      capturedEmail:     r.captured_email || '',
      capturedCompany:   r.captured_company || '',
      capturedPhone:     r.captured_phone || '',
      productIdContext:  r.product_id_context ? Number(r.product_id_context) : null,
      idEmployee:        r.id_employee ? Number(r.id_employee) : null,
      idSmartlead:       r.id_smartlead ? Number(r.id_smartlead) : null,
      lastMessageAt:     r.last_message_at,
      lastMessageRole:   r.last_message_role || null,
      lastMessageSnippet: r.last_message_content
        ? String(r.last_message_content).slice(0, 140)
        : '',
      dateAdd:           r.date_add,
      dateUpd:           r.date_upd,
    })),
  }
})
