

import { listActiveClientVps } from '~/internal/hub/server/utils/hub'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const clientFilter = (query.client as string | undefined) || null

  try {
    const rows = await listActiveClientVps(clientFilter)
    const vps = rows.map((r) => ({
      clientId: r.client_id,
      name: r.name,
      ip: r.ip,
      domain: r.domain,
      purpose: r.purpose,
      sshUser: r.ssh_user,
      dbContainer: r.db_container,
      dbName: r.db_name,
      dbUser: r.db_user,
      webContainer: r.web_container,
      critical: r.critical === 1,
      notes: r.notes,
    }))
    return { vps }
  } catch (err: any) {
    console.error('[API client-vps] DB error:', err.message)
    return { vps: [], error: 'DB unavailable' }
  }
})
