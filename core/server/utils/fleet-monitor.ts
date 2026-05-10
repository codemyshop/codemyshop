/**
 *
 * Fleet Monitor — Monitoring of all satellite instances.
 * Ping each instance, aggregate metrics, calculate headroom.
 *
 * PostgreSQL-only runtime — project #38/#44 (MariaDB migration).
 * Cible : `cs_main.cs_ai_telemetry` (Postgres).
 */
import { sql } from 'drizzle-orm'
import { usePocPg } from '../db/drizzle-pg'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface InstanceStatus {
  clientId:      string
  clientName:    string
  domain:        string
  // Santé
  dockerStatus:  'running' | 'stopped' | 'unreachable'
  nuxtHealthy:   boolean
  latencyMs:     number
  httpStatus:    number
  // Versions
  acBaseVersion: string
  nuxtVersion:   string
  // Backup
  lastBackup:    string | null
  // FinOps
  monthlyFee:    number
  aiCostMtd:     number      // Month-To-Date
  vpsCost:       number
  grossMargin:   number      // fee - aiCost - vpsCost
  marginPercent: number
  // Meta
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

// ── Coûts fixes ───────────────────────────────────────────────────────────────

const DEFAULT_MONTHLY_FEE = 800
const DEFAULT_VPS_COST    = 30     // OVH VPS ~30€/mois par instance

// ── Ping une instance ─────────────────────────────────────────────────────────

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

  // Tenter un ping HTTP vers le system-status
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
      // License expired mais le serveur répond
      dockerStatus = 'running'
    } else if (httpStatus > 0) {
      dockerStatus = 'running'
    } else {
      dockerStatus = 'unreachable'
    }
  }

  // FinOps : lire la consommation IA depuis la télémétrie Redis
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
    lastBackup:    null,  // à brancher sur le système de backup
    monthlyFee,
    aiCostMtd:     Math.round(aiCostMtd * 100) / 100,
    vpsCost,
    grossMargin:   Math.round(grossMargin * 100) / 100,
    marginPercent,
    checkedAt:     new Date().toISOString(),
  }
}

// ── Scan de toute la flotte ───────────────────────────────────────────────────

export async function scanFleet(): Promise<FleetSummary> {
  const { listFleetVps } = await import('~/internal/hub/server/utils/hub')
  const clients = await listFleetVps()

  // Ping en parallèle (max 10 concurrents)
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

// ── Coût IA MTD par client (depuis DB cs_ai_telemetry) ────────────────────

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
