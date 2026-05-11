

interface ReactorAgent {
  codename: string
  nickname: string
  role: string
  avatarUrl: string
  group: string
  initials: string
  description: string
  auto: boolean
  status: string
  lastSeen: string | null
  lastActivity: {
    action: string
    summary: string
    severity: string
    ts: string
    durationMs: number
  } | null
}

interface ActivityEntry {
  id: string
  agent: string
  action: string
  summary: string
  severity: string
  ts: string
  durationMs: number
  details?: Record<string, unknown>
}

interface ReactorStats {
  totalChecks24h: number
  activeAgents: number
  totalAgents: number
  lastError: { agent: string; summary: string; ts: string } | null
  lastUpdate: string | null
}

interface ReactorResponse {
  agents: ReactorAgent[]
  recentActivity: ActivityEntry[]
  stats: ReactorStats
}

export function useReactor() {
  
  const { data: initialData, refresh } = useFetch<ReactorResponse>('/api/reactor', {
    key: 'reactor-data',
    default: () => ({
      agents: [] as ReactorAgent[],
      recentActivity: [] as ActivityEntry[],
      stats: { totalChecks24h: 0, activeAgents: 0, totalAgents: 0, lastError: null, lastUpdate: null } as ReactorStats,
    }),
  })

  
  const agents = ref<ReactorAgent[]>([])
  const activity = ref<ActivityEntry[]>([])
  const stats = ref<ReactorStats>({ totalChecks24h: 0, activeAgents: 0, totalAgents: 0, lastError: null, lastUpdate: null })
  const isLive = ref(false)
  const error = ref<string | null>(null)

  
  watch(initialData, (data) => {
    if (data) {
      agents.value = data.agents
      activity.value = data.recentActivity
      stats.value = data.stats
    }
  }, { immediate: true })

  let eventSource: EventSource | null = null
  let pollTimer: ReturnType<typeof setInterval> | null = null

  async function fetchInitial() {
    try {
      const data = await $fetch<ReactorResponse>('/api/reactor')
      agents.value = data.agents
      activity.value = data.recentActivity
      stats.value = data.stats
      error.value = null
    } catch (e: any) {
      error.value = e.message || 'Erreur de chargement'
    }
  }

  
  function connectSSE() {
    if (typeof window === 'undefined') return

    try {
      eventSource = new EventSource('/api/reactor-stream')

      eventSource.addEventListener('init', () => {
        isLive.value = true
        error.value = null
      })

      eventSource.addEventListener('activity', (e: MessageEvent) => {
        try {
          const entry: ActivityEntry = JSON.parse(e.data)
          activity.value = [entry, ...activity.value].slice(0, 50)
          stats.value.totalChecks24h++
          stats.value.lastUpdate = entry.ts

          const agentIdx = agents.value.findIndex(a => a.codename === entry.agent)
          if (agentIdx >= 0) {
            agents.value[agentIdx] = {
              ...agents.value[agentIdx],
              status: 'idle',
              lastSeen: entry.ts,
              lastActivity: {
                action: entry.action,
                summary: entry.summary,
                severity: entry.severity,
                ts: entry.ts,
                durationMs: entry.durationMs,
              },
            }
          }
        } catch {  }
      })

      eventSource.addEventListener('heartbeats', (e: MessageEvent) => {
        try {
          const hb: Record<string, { lastSeen: string; status: string }> = JSON.parse(e.data)
          for (const agent of agents.value) {
            if (hb[agent.codename]) {
              agent.status = hb[agent.codename].status
              agent.lastSeen = hb[agent.codename].lastSeen
            }
          }
        } catch {  }
      })

      eventSource.onerror = () => {
        isLive.value = false
        if (!pollTimer) {
          pollTimer = setInterval(fetchInitial, 30000)
        }
      }
    } catch {
      isLive.value = false
      pollTimer = setInterval(fetchInitial, 30000)
    }
  }

  function cleanup() {
    if (eventSource) { eventSource.close(); eventSource = null }
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
  }

  if (import.meta.client) {
    onMounted(() => connectSSE())
    onUnmounted(() => cleanup())
  }

  return {
    agents: readonly(agents),
    activity: readonly(activity),
    stats: readonly(stats),
    isLive: readonly(isLive),
    error: readonly(error),
    refresh: fetchInitial,
  }
}
