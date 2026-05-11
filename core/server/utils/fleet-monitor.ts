

import { sql } from 'drizzle-orm'
import { usePocPg } from '../db/drizzle-pg'

export interface InstanceStatus {
  clientId:      string
  clientName:    string
  domain:        string
  
  dockerStatus:  'running' | 'stopped' | 'unreachable'
  nuxtHealthy:   boolean
  latencyMs:     number
  httpStatus:    number
  
  acBaseVersion: string
  nuxtVersion:   string
  
  lastBackup:    string | null
  
  monthlyFee:    number
  aiCostMtd:     number      
  vpsCost:       number
  grossMargin:   number      
  marginPercent: number
  
  checkedAt:     string
}

export interface FleetSummary {
  totalInstances:  number
  healthyCount:    number
  unhealthyCount:  number
  totalMrr:        number
  totalAiCost:     number
  totalVpsCost:    number
  totalGrossMargin: number
  avgMarginPercent: number
  avgLatencyMs:    number
  instances:       InstanceStatus[]
  generatedAt:     string
}

const DEFAULT_MONTHLY_FEE = 800
const DEFAULT_VPS_COST    = 30     

export async function pingInstance(client: {
  id: string; name: string; domain: string; nuxt_port?: number
}): Promise<InstanceStatus> {
  const start = Date.now()
  let healthy = false
  let httpStatus = 0
  let latencyMs = 0
  let dockerStatus: InstanceStatus['dockerStatus'] = 'unreachable'
  let acBaseVersion = 'unknown'
  let nuxtVersion = 'unknown'

  
  const url = client.nuxt_port
    ? `http://localhost:${client.nuxt_port}/api/hub/system-status`
    : `https://${client.domain}/api/hub/system-status`

  try {
    const res = await $fetch<any>(url, { timeout: 8000 })
    latencyMs = Date.now() - start
    httpStatus = 200
    healthy = true
    dockerStatus = 'running'
    nuxtVersion = '3.21.x'
    acBaseVersion = res?.ai?.model ?? 'unknown'
  } catch (err: any) {
    latencyMs = Date.now() - start
    httpStatus = err?.statusCode ?? 0

    if (httpStatus === 403) {
      
      dockerStatus = 'running'
    } else if (httpStatus > 0) {
      dockerStatus = 'running'
    } else {
      dockerStatus = 'unreachable'
    }
  }

  
  const aiCostMtd = await getClientAiCostMtd(client.id)

  const monthlyFee   = DEFAULT_MONTHLY_FEE
  const vpsCost      = DEFAULT_VPS_COST
  const grossMargin  = monthlyFee - aiCostMtd - vpsCost
  const marginPercent = monthlyFee > 0 ? Math.round((grossMargin / monthlyFee) * 100) : 0

  return {
    clientId:      client.id,
    clientName:    client.name,
    domain:        client.domain,
    dockerStatus,
    nuxtHealthy:   healthy,
    latencyMs,
    httpStatus,
    acBaseVersion,
    nuxtVersion,
    lastBackup:    null,  
    monthlyFee,
    aiCostMtd:     Math.round(aiCostMtd * 100) / 100,
    vpsCost,
    grossMargin:   Math.round(grossMargin * 100) / 100,
    marginPercent,
    checkedAt:     new Date().toISOString(),
  }
}

export async function scanFleet(): Promise<FleetSummary> {
  const { listFleetVps } = await import('~/internal/hub/server/utils/hub')
  const clients = await listFleetVps()

  
  const instances: InstanceStatus[] = []
  const batchSize = 10

  for (let i = 0; i < clients.length; i += batchSize) {
    const batch = clients.slice(i, i + batchSize)
    const results = await Promise.allSettled(
      batch.map(c => pingInstance(c))
    )
    for (const r of results) {
      if (r.status === 'fulfilled') instances.push(r.value)
    }
  }

  const healthyCount   = instances.filter(i => i.nuxtHealthy).length
  const totalMrr       = instances.reduce((s, i) => s + i.monthlyFee, 0)
  const totalAiCost    = instances.reduce((s, i) => s + i.aiCostMtd, 0)
  const totalVpsCost   = instances.reduce((s, i) => s + i.vpsCost, 0)
  const totalGrossMargin = totalMrr - totalAiCost - totalVpsCost
  const avgLatency     = instances.length > 0
    ? Math.round(instances.reduce((s, i) => s + i.latencyMs, 0) / instances.length)
    : 0
  const avgMargin      = instances.length > 0
    ? Math.round(instances.reduce((s, i) => s + i.marginPercent, 0) / instances.length)
    : 0

  return {
    totalInstances:   instances.length,
    healthyCount,
    unhealthyCount:   instances.length - healthyCount,
    totalMrr,
    totalAiCost:      Math.round(totalAiCost * 100) / 100,
    totalVpsCost,
    totalGrossMargin: Math.round(totalGrossMargin * 100) / 100,
    avgMarginPercent: avgMargin,
    avgLatencyMs:     avgLatency,
    instances,
    generatedAt:      new Date().toISOString(),
  }
}

async function getClientAiCostMtd(clientId: string): Promise<number> {
  try {
    const rows: any = await usePocPg().execute(sql`
      SELECT COALESCE(SUM(cost), 0) AS "totalCost"
        FROM cs_main.cs_ai_telemetry
       WHERE client_id = ${clientId}
         AND date_add >= date_trunc('month', CURRENT_DATE)
    `)
    const row = Array.isArray(rows) ? rows[0] : null
    return row?.totalCost ? Number(row.totalCost) : 0
  } catch {
    return 0
  }
}
