

import {
  listAgentsForReactor,
  listHeartbeats,
  listRecentActivity,
} from '~/internal/agents/server/utils/agents'
import { countAutomates } from '~/internal/automates/server/utils/automates'

interface AgentEntry {
  id: number
  codename: string
  nickname: string
  role: string
  avatarUrl: string
  group: string
  initials: string
  auto: boolean
  description: string
}

export default defineEventHandler(async (event) => {
  try {
    const agentsFromDb = await listAgentsForReactor({ event })
    const heartbeatRows = await listHeartbeats({ event })
    const activityRows = await listRecentActivity(200, { event })

    
    const heartbeats: Record<string, any> = {}
    for (const hb of heartbeatRows) {
      heartbeats[hb.agent_codename] = { lastSeen: hb.last_seen, status: hb.status }
    }
    const activityList = activityRows.map((a: any) => ({
      id: a.activity_id, agent: a.agent_codename, action: a.action,
      summary: a.summary, severity: a.severity, ts: a.date_add,
      durationMs: a.duration_ms, details: a.details ? JSON.parse(a.details) : {},
    }))

    const agentsList: AgentEntry[] = agentsFromDb.map((a: any) => ({
      id: a.id_agent,
      codename: a.codename,
      nickname: a.nickname,
      role: a.role,
      avatarUrl: a.avatar_url ?? `/agents/${a.codename}.webp`,
      group: a.group_name ?? 'execution',
      initials: a.initials ?? a.nickname?.substring(0, 2) ?? '',
      auto: a.auto_spawn === 1,
      description: a.description ?? a.job_sheet ?? '',
    }))
    const activity = { heartbeats, activity: activityList }

    
    const REDACTED_PATTERNS = [
      /CVE-\d{4}-\d+[^—;]*/gi,           
      /nginx\/[\d.]+[^;—]*/gi,            
      /Node v?[\d.]+\s*vulnérable[^;—]*/gi, 
      /Node v?[\d.]+\s*en EOL[^;—]*/gi,   
      /X-Powered-By[^;—]*/gi,             
      /Server header bavard[^;—]*/gi,     
    ]

    function sanitizeSummary(agent: string, summary: string): string {
      if (agent !== 'securite') return summary
      let clean = summary
      for (const pattern of REDACTED_PATTERNS) {
        clean = clean.replace(pattern, '[redacted]')
      }
      
      clean = clean.replace(/\s*[—;]\s*\[redacted\]/g, '')
      clean = clean.replace(/\[redacted\]\s*[—;]\s*/g, '')
      clean = clean.replace(/\[redacted\]/g, '')
      clean = clean.replace(/\s*⚠️\s*\d+\s*CVE:\s*$/g, '')
      clean = clean.replace(/\s*—\s*—\s*/g, ' — ')
      clean = clean.replace(/\s*—\s*$/g, '')
      return clean.trim() || 'Audit sécurité terminé'
    }

    
    const now = Date.now()
    const ACTIVE_WINDOW_MS = 10 * 60 * 1000 
    const agents = agentsList.map((a) => {
      const hb = activity.heartbeats[a.codename]
      const lastAct = activity.activity.find((act) => act.agent === a.codename)

      const isRunning = hb?.status === 'running'
      const lastActTs = lastAct ? new Date(lastAct.ts).getTime() : 0
      const isRecentActivity = lastActTs > now - ACTIVE_WINDOW_MS

      return {
        codename: a.codename,
        nickname: a.nickname,
        role: a.role,
        avatarUrl: a.avatarUrl,
        group: a.group,
        initials: a.initials,
        description: a.description,
        auto: a.auto,
        status: hb?.status ?? 'standby',
        isActive: isRunning || isRecentActivity,
        lastSeen: hb?.lastSeen ?? null,
        lastActivity: lastAct
          ? {
              action: lastAct.action,
              summary: sanitizeSummary(lastAct.agent, lastAct.summary),
              severity: lastAct.severity,
              ts: lastAct.ts,
              durationMs: lastAct.durationMs,
            }
          : null,
      }
    })

    
    const h24 = now - 24 * 60 * 60 * 1000
    const recent24h = activity.activity.filter((a) => new Date(a.ts).getTime() > h24)
    const lastError = activity.activity.find((a) => a.severity === 'error')

    
    const autoRow = await countAutomates({ event })

    return {
      agents,
      recentActivity: activity.activity.slice(0, 50).map((a) => ({
        ...a,
        summary: sanitizeSummary(a.agent, a.summary),
        details: a.agent === 'securite' ? undefined : a.details,
      })),
      stats: {
        totalChecks24h: recent24h.length,
        activeAgents: agentsList.length,
        totalAgents: agentsList.length,
        totalAutomates: autoRow.total,
        automatesActifs: autoRow.actifs,
        lastError: lastError
          ? { agent: lastError.agent, summary: sanitizeSummary(lastError.agent, lastError.summary), ts: lastError.ts }
          : null,
        lastUpdate: activity.activity.length
          ? activity.activity[activity.activity.length - 1].ts
          : null,
      },
    }
  } catch (err: any) {
    console.error('[reactor] DB error:', err?.message || err)
    return { agents: [], recentActivity: [], stats: { totalChecks24h: 0, activeAgents: 0, totalAgents: 0, lastError: null, lastUpdate: null } }
  }
})
