

import { eq, sql } from 'drizzle-orm'
import { usePocPg } from '../db/drizzle-pg'
import { leadqualVaisseau, type LeadqualPgRow } from '../db/schema-pg/leadqual'

export type LeadSegment = 'low' | 'mid' | 'elite'
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost'

export interface LeadQualification {
  leadId: string
  companyName: string | null
  email: string | null
  estimatedRevenue: number
  segment: LeadSegment
  segmentLabel: string
  score: number
  source: string | null
  needs: string | null
  notes: string | null
  status: LeadStatus
  idAcSmartlead: number | null
  createdAt: string
  updatedAt: string
}

function toIso(d: Date | string | null | undefined): string {
  if (!d) return ''
  if (typeof d === 'string') return d
  return d.toISOString()
}

function rowToQualification(r: LeadqualPgRow): LeadQualification {
  return {
    leadId: r.leadId,
    companyName: r.companyName ?? null,
    email: r.email ?? null,
    estimatedRevenue: Number(r.estimatedRevenue ?? 0),
    segment: r.segment as LeadSegment,
    segmentLabel: r.segmentLabel,
    score: Number(r.score ?? 0),
    source: r.source ?? null,
    needs: r.needs ?? null,
    notes: r.notes ?? null,
    status: r.status as LeadStatus,
    idAcSmartlead: r.idAcSmartlead ?? null,
    createdAt: toIso(r.dateAdd),
    updatedAt: toIso(r.dateUpd),
  }
}

export async function readQualifications(_event?: any): Promise<Record<string, LeadQualification>> {
  const d = usePocPg()
  const all = await d.select().from(leadqualVaisseau)
  const out: Record<string, LeadQualification> = {}
  for (const r of all as LeadqualPgRow[]) {
    out[r.leadId] = rowToQualification(r)
  }
  return out
}

export async function getQualification(leadId: string, _event?: any): Promise<LeadQualification | null> {
  if (!leadId) return null
  const d = usePocPg()
  const r = (await d.select().from(leadqualVaisseau).where(eq(leadqualVaisseau.leadId, leadId)).limit(1))[0]
  return r ? rowToQualification(r as LeadqualPgRow) : null
}

export interface UpsertQualificationInput {
  estimatedRevenue?: number
  companyName?: string | null
  email?: string | null
  segment?: LeadSegment
  segmentLabel?: string
  score?: number
  source?: string | null
  needs?: string | null
  notes?: string | null
  status?: LeadStatus
  idAcSmartlead?: number | null
}

export async function upsertQualification(
  leadId: string,
  patch: UpsertQualificationInput,
  event?: any,
): Promise<LeadQualification> {
  if (!leadId) throw new Error('leadId requis')
  const d = usePocPg()

  let segment = patch.segment
  let segmentLabel = patch.segmentLabel
  if (typeof patch.estimatedRevenue === 'number' && (!segment || !segmentLabel)) {
    const derived = getSegmentLabel(patch.estimatedRevenue)
    segment = segment || derived.tier
    segmentLabel = segmentLabel || derived.label
  }

  
  await d.execute(sql`
    INSERT INTO cs_main.cs_leadqual
      (lead_id, company_name, email, estimated_revenue, segment, segment_label,
       score, source, needs, notes, status, id_ac_smartlead, date_add, date_upd)
    VALUES
      (${leadId},
       ${patch.companyName ?? null},
       ${patch.email ?? null},
       ${patch.estimatedRevenue ?? 0},
       ${segment ?? 'low'},
       ${segmentLabel ?? 'Segment Low-Tier'},
       ${patch.score ?? 0},
       ${patch.source ?? null},
       ${patch.needs ?? null},
       ${patch.notes ?? null},
       ${patch.status ?? 'new'},
       ${patch.idAcSmartlead ?? null},
       NOW(), NOW())
    ON CONFLICT (lead_id) DO UPDATE SET
       company_name      = COALESCE(EXCLUDED.company_name, cs_main.cs_leadqual.company_name),
       email             = COALESCE(EXCLUDED.email, cs_main.cs_leadqual.email),
       estimated_revenue = EXCLUDED.estimated_revenue,
       segment           = EXCLUDED.segment,
       segment_label     = EXCLUDED.segment_label,
       score             = EXCLUDED.score,
       source            = COALESCE(EXCLUDED.source, cs_main.cs_leadqual.source),
       needs             = COALESCE(EXCLUDED.needs, cs_main.cs_leadqual.needs),
       notes             = COALESCE(EXCLUDED.notes, cs_main.cs_leadqual.notes),
       status            = EXCLUDED.status,
       id_ac_smartlead   = COALESCE(EXCLUDED.id_ac_smartlead, cs_main.cs_leadqual.id_ac_smartlead),
       date_upd          = NOW()
  `)

  const after = await getQualification(leadId, event)
  if (!after) throw new Error(`upsert ${leadId} a échoué`)
  return after
}

export async function writeQualifications(
  data: Record<string, Partial<LeadQualification>>,
  event?: any,
): Promise<void> {
  for (const [leadId, q] of Object.entries(data)) {
    await upsertQualification(leadId, {
      estimatedRevenue: q.estimatedRevenue,
      companyName: q.companyName,
      email: q.email,
      segment: q.segment,
      segmentLabel: q.segmentLabel,
      score: q.score,
      source: q.source,
      needs: q.needs,
      notes: q.notes,
      status: q.status,
      idAcSmartlead: q.idAcSmartlead,
    }, event)
  }
}

export function getSegmentLabel(revenue: number): { label: string; tier: LeadSegment } {
  if (revenue >= 1_000_000) return { label: 'Segment Elite', tier: 'elite' }
  if (revenue >= 300_000) return { label: 'Segment Mid-Market', tier: 'mid' }
  return { label: 'Segment Low-Tier', tier: 'low' }
}
