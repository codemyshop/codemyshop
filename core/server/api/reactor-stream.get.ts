

import {
  listHeartbeats,
  listRecentActivity,
  listActivitySince,
  getMaxActivityId,
} from '~/internal/agents/server/utils/agents'

const SECURITY_PATTERNS = [
  /CVE-\d{4}-\d+[^—;]*/gi,
  /nginx\/[\d.]+[^;—]*/gi,
  /Node v?[\d.]+\s*vulnérable[^;—]*/gi,
  /Node v?[\d.]+\s*en EOL[^;—]*/gi,
  /X-Powered-By[^;—]*/gi,
  /Server header bavard[^;—]*/gi,
]

function sanitizeEntry(entry: Record<string, unknown>): Record<string, unknown> {
  if (entry.agent !== 'securite' && entry.agent_codename !== 'securite') return entry
  let summary = String(entry.summary ?? '')
  for (const p of SECURITY_PATTERNS) summary = summary.replace(p, '')
  summary = summary.replace(/\s*[—;]\s*[—;]\s*/g, ' — ').replace(/\s*—\s*$/g, '').replace(/\s*⚠️\s*\d+\s*CVE:\s*$/g, '').trim()
  return { ...entry, summary: summary || 'Audit sécurité terminé', details: undefined }
}

export default defineEventHandler(async (event) => {
  
  setResponseHeaders(event, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  })

  const res = event.node.res

  function send(data: unknown, eventType: string = 'activity') {
    if (res.closed) return
    res.write(`event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`)
  }

  
  const recentActivityRows = await listRecentActivity(10, { event })
  const recentActivity = recentActivityRows.map((r) => ({
    agent: r.agent_codename,
    action: r.action,
    summary: r.summary,
    severity: r.severity,
    duration_ms: r.duration_ms,
    ts: r.date_add,
  }))
  const heartbeats = await listHeartbeats({ event })

  const heartbeatMap: Record<string, { status: string; lastSeen: string }> = {}
  for (const hb of heartbeats) {
    heartbeatMap[hb.agent_codename] = { status: hb.status, lastSeen: hb.last_seen }
  }

  send({
    type: 'init',
    activity: recentActivity.reverse().map((a) => sanitizeEntry(a as Record<string, unknown>)),
    heartbeats: heartbeatMap,
  }, 'init')

  
  let lastSeenId = await getMaxActivityId({ event })

  
  const keepAlive = setInterval(() => {
    if (res.closed) return
    res.write(': keepalive\n\n')
  }, 30000)

  
  const poller = setInterval(async () => {
    if (res.closed) return
    try {
      const newEntries = await listActivitySince(lastSeenId, { event })
      for (const entry of newEntries) {
        const e = {
          id_activity: (entry as any).id_activity,
          agent: entry.agent_codename,
          action: entry.action,
          summary: entry.summary,
          severity: entry.severity,
          duration_ms: entry.duration_ms,
          ts: entry.date_add,
        }
        send(sanitizeEntry(e as Record<string, unknown>), 'activity')
        lastSeenId = (entry as any).id_activity
      }
      if (newEntries.length > 0) {
        const hbs = await listHeartbeats({ event })
        const hbMap: Record<string, { status: string; lastSeen: string }> = {}
        for (const hb of hbs) hbMap[hb.agent_codename] = { status: hb.status, lastSeen: hb.last_seen }
        send(hbMap, 'heartbeats')
      }
    } catch {
      
    }
  }, 3000)

  
  return new Promise<void>((resolve) => {
    res.on('close', () => {
      clearInterval(keepAlive)
      clearInterval(poller)
      resolve()
    })
  })
})
