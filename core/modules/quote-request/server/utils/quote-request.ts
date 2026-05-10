/**
 *
 * quoterequest facade — prospect form "quote request"
 * (≠ ac_quote facturation B2B).
 *
 * Surface :
 *  - createQuoteRequestWithItems (event handler SaveToDatabase)
 *  - linkCrmToQuoteRequest (PushToCrm post-success)
 * - listQuoteRequests + countQuoteRequests (back-office paginated list)
 * - getQuoteRequestById + listItemsForQuoteRequest (back-office details)
 *  - updateQuoteRequestStatus (BO status PUT)
 *
 * Phase 5 — 100% PostgreSQL facade (postgres-js, schema
 * No more tenant/event routing: the main database is the
 * only runtime source of truth.
 */

import { sql } from 'drizzle-orm'
import { usePocPg } from '../../../../server/db/drizzle-pg'

export interface QuoteRequestInput {
  firstname: string
  lastname: string
  email: string
  phone: string
  company: string
  siret: string
  activite: string
  message: string | null
  totalItems: number
  /** Enrichissement INSEE (recherche-entreprises.api.gouv.fr). Optionnel. */
  legalName?:    string
  nafCode?:      string
  nafLabel?:     string
  postalCode?:   string
  cityInsee?:    string
  addressInsee?: string
  staffSize?:    string
}

export interface QuoteRequestItemInput {
  idProduct: number
  name: string
  reference: string | null
  quantity: number
}

export async function createQuoteRequestWithItems(
  input: QuoteRequestInput,
  items: QuoteRequestItemInput[],
): Promise<number> {
  const pg = usePocPg()
  const insRes = await pg.execute<{ id_quote_request: number }>(sql`
    INSERT INTO cs_main.cs_quote_request
      (firstname, lastname, email, phone, company, siret, activite, message, total_items, status,
       legal_name, naf_code, naf_label, postal_code, city_insee, address_insee, staff_size,
       date_add, date_upd)
    VALUES
      (${input.firstname}, ${input.lastname}, ${input.email}, ${input.phone},
       ${input.company}, ${input.siret}, ${input.activite}, ${input.message},
       ${input.totalItems}, 'pending',
       ${input.legalName    ?? ''}, ${input.nafCode      ?? ''}, ${input.nafLabel  ?? ''},
       ${input.postalCode   ?? ''}, ${input.cityInsee    ?? ''}, ${input.addressInsee ?? ''},
       ${input.staffSize    ?? ''},
       NOW(), NOW())
    RETURNING id_quote_request
  `)
  const idQuoteRequest = Number((insRes as any[])[0]?.id_quote_request || 0)

  let position = 0
  for (const item of items) {
    await pg.execute(sql`
      INSERT INTO cs_main.cs_quote_request_item
        (id_quote_request, id_product, name, reference, quantity, position, date_add)
      VALUES
        (${idQuoteRequest}, ${item.idProduct}, ${item.name}, ${item.reference},
         ${item.quantity}, ${position}, NOW())
    `)
    position++
  }

  return idQuoteRequest
}

export async function linkCrmToQuoteRequest(
  idQuoteRequest: number,
  leadId: number,
  projectId: number,
): Promise<void> {
  await usePocPg().execute(sql`
    UPDATE cs_main.cs_quote_request
       SET lead_id = ${leadId}, project_id = ${projectId}, date_upd = NOW()
     WHERE id_quote_request = ${idQuoteRequest}
  `)
}

export interface QuoteRequestRow {
  id: number
  firstname: string
  lastname: string
  email: string
  phone: string
  company: string
  siret: string
  activite: string
  message: string | null
  totalItems: number
  status: string
  noteInterne: string | null
  dateAdd: string
  dateUpd: string
  /** Number of retries (cs_quote_recovery) already sent for this quotation. */
  recoveriesCount: number
}

export interface ListQuoteRequestsFilters {
  search?: string
  status?: string
  perPage: number
  offset: number
}

export async function listQuoteRequests(
  f: ListQuoteRequestsFilters,
): Promise<QuoteRequestRow[]> {
  const conds: any[] = []
  if (f.search) {
    const s = `%${f.search}%`
    conds.push(sql`(q.firstname ILIKE ${s} OR q.lastname ILIKE ${s} OR q.email ILIKE ${s} OR q.company ILIKE ${s})`)
  }
  if (f.status) conds.push(sql`q.status = ${f.status}`)
  const where = conds.length ? sql` WHERE ${sql.join(conds, sql` AND `)}` : sql``

  const rows = await usePocPg().execute<any>(sql`
    SELECT
      q.id_quote_request AS "id", q.firstname, q.lastname, q.email, q.phone,
      q.company, q.siret, q.activite, q.message,
      q.total_items AS "totalItems",
      q.status, q.note_interne AS "noteInterne",
      q.date_add AS "dateAdd", q.date_upd AS "dateUpd",
      (SELECT COUNT(*) FROM cs_main.cs_quote_recovery r
        WHERE r.id_quote_request = q.id_quote_request) AS "recoveriesCount"
    FROM cs_main.cs_quote_request q
    ${where}
    ORDER BY q.id_quote_request DESC
    LIMIT ${f.perPage} OFFSET ${f.offset}
  `)
  return (rows as any[]).map((r) => ({
    id: Number(r.id),
    firstname: r.firstname,
    lastname: r.lastname,
    email: r.email,
    phone: r.phone,
    company: r.company,
    siret: r.siret,
    activite: r.activite,
    message: r.message,
    totalItems: Number(r.totalItems),
    status: r.status,
    noteInterne: r.noteInterne,
    dateAdd: r.dateAdd,
    dateUpd: r.dateUpd,
    recoveriesCount: Number(r.recoveriesCount) || 0,
  }))
}

export async function countQuoteRequests(
  f: Omit<ListQuoteRequestsFilters, 'perPage' | 'offset'>,
): Promise<number> {
  const conds: any[] = []
  if (f.search) {
    const s = `%${f.search}%`
    conds.push(sql`(q.firstname ILIKE ${s} OR q.lastname ILIKE ${s} OR q.email ILIKE ${s} OR q.company ILIKE ${s})`)
  }
  if (f.status) conds.push(sql`q.status = ${f.status}`)
  const where = conds.length ? sql` WHERE ${sql.join(conds, sql` AND `)}` : sql``

  const rows = await usePocPg().execute<{ total: number }>(sql`
    SELECT COUNT(*)::int AS "total" FROM cs_main.cs_quote_request q ${where}
  `)
  return Number((rows as any[])[0]?.total || 0)
}

export async function getQuoteRequestById(
  idQuoteRequest: number,
): Promise<QuoteRequestRow | null> {
  const rows = await usePocPg().execute<any>(sql`
    SELECT id_quote_request AS "id", firstname, lastname, email, phone,
           company, siret, activite, message,
           total_items AS "totalItems",
           status, note_interne AS "noteInterne",
           date_add AS "dateAdd", date_upd AS "dateUpd"
      FROM cs_main.cs_quote_request WHERE id_quote_request = ${idQuoteRequest}
  `)
  const r = (rows as any[])[0]
  if (!r) return null
  return {
    id: Number(r.id),
    firstname: r.firstname,
    lastname: r.lastname,
    email: r.email,
    phone: r.phone,
    company: r.company,
    siret: r.siret,
    activite: r.activite,
    message: r.message,
    totalItems: Number(r.totalItems),
    status: r.status,
    noteInterne: r.noteInterne,
    dateAdd: r.dateAdd,
    dateUpd: r.dateUpd,
  }
}

export interface QuoteRequestItem {
  id: number
  name: string
  reference: string | null
  quantity: number
  position: number
}

export async function listItemsForQuoteRequest(
  idQuoteRequest: number,
): Promise<QuoteRequestItem[]> {
  const rows = await usePocPg().execute<any>(sql`
    SELECT id_product AS "id", name, reference, quantity, position
      FROM cs_main.cs_quote_request_item
     WHERE id_quote_request = ${idQuoteRequest}
     ORDER BY position ASC, id_quote_request_item ASC
  `)
  return (rows as any[]).map((r) => ({
    id: Number(r.id),
    name: r.name,
    reference: r.reference,
    quantity: Number(r.quantity),
    position: Number(r.position),
  }))
}

export async function updateQuoteRequestStatus(
  idQuoteRequest: number,
  status: string,
  noteInterne: string | null | undefined,
): Promise<void> {
  if (noteInterne !== undefined) {
    await usePocPg().execute(sql`
      UPDATE cs_main.cs_quote_request
         SET status = ${status}, note_interne = ${noteInterne}, date_upd = NOW()
       WHERE id_quote_request = ${idQuoteRequest}
    `)
  } else {
    await usePocPg().execute(sql`
      UPDATE cs_main.cs_quote_request
         SET status = ${status}, date_upd = NOW()
       WHERE id_quote_request = ${idQuoteRequest}
    `)
  }
}
