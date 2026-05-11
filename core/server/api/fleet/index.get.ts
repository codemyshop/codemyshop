

import { sql } from 'drizzle-orm'
import { usePocPg } from '~/server/db/drizzle-pg'
import { verifyToken } from '~/server/utils/session-crypto'

export default defineEventHandler(async (event) => {
  
  const session = verifyToken<any>(getCookie(event, 'hub_session'))
  if (!session) throw createError({ statusCode: 401, message: 'Non authentifié' })
  if (!session.isAdmin || session.profileId !== 1) throw createError({ statusCode: 403 })

  const rows: any[] = await usePocPg().execute(sql`
    SELECT
      client_id        AS "clientId",
      name             AS "name",
      domain           AS "domain",
      vps_ip           AS "vpsIp",
      status           AS "status",
      offer            AS "offer",
      mrr              AS "mrr",
      setup_fee        AS "setupFee",
      created_at       AS "createdAt",
      admin_url        AS "adminUrl",
      admin_email      AS "adminEmail",
      admin_password   AS "adminPassword",
      api_key          AS "apiKey",
      note             AS "note"
    FROM cs_main.cs_fleet_instance
    ORDER BY created_at DESC
  `) as any[]

  return (rows ?? []).map((i: any) => ({
    id: i.clientId,
    name: i.name,
    domain: i.domain,
    vps_ip: i.vpsIp,
    status: i.status,
    offer: i.offer,
    mrr: parseFloat(i.mrr) || 0,
    setup_fee: parseFloat(i.setupFee) || 0,
    created_at: i.createdAt,
    credentials: (i.adminUrl || i.adminEmail || i.apiKey) ? {
      admin_url: i.adminUrl,
      email: i.adminEmail,
      password: i.adminPassword,
      api_key: i.apiKey,
      note: i.note,
    } : null,
  }))
})
