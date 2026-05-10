/**
 *
 * FreightRule facade — source of truth `cs_freight_rule`, owned by
 * the freight rule module.
 *
 * Chantier #38 phase D2 / chantier #44 — port 100% PostgreSQL via usePocPg().
 * Platform-only (global ac-hub table, cs_main schema), no scoping
 * client_id: everything goes through `usePocPg()`. `ctx` signature preserved for
 * stability of consumer call-sites (no-op on implementation side).
 *
 * Surface: CRUD + resolution (winning rule for a given cart).
 * The scopeLabel (human-readable label) is still calculated via native SQL because the join
 * depends on the scope (cs_price_group / ps_carrier / ps_zone).
 */

import { sql } from 'drizzle-orm'
import { usePocPg } from '../../../../server/db/drizzle-pg'

export type FreightScope = 'all' | 'carrier' | 'zone' | 'customer_group'
export type FreightThresholdType = 'amount_ht' | 'weight_kg' | 'pallets'

export const FREIGHT_SCOPES: FreightScope[] = ['all', 'carrier', 'zone', 'customer_group']
export const FREIGHT_THRESHOLDS: FreightThresholdType[] = ['amount_ht', 'weight_kg', 'pallets']

export interface FreightRuleItem {
  id: number
  label: string
  scope: FreightScope
  scopeId: number
  scopeLabel?: string
  thresholdType: FreightThresholdType
  thresholdValue: number
  priority: number
  active: number
}

interface FreightContext {
  event?: any
  clientId?: string
}

/**
 * List all rules with resolved scope label (admin).
 * Tri : priority DESC, id ASC.
 */
export async function listFreightRulesWithScopeLabel(
  _ctx: FreightContext = {},
): Promise<FreightRuleItem[]> {
  const result = await usePocPg().execute<any>(sql`
    SELECT r.id_rule,
           r.label,
           r.scope,
           r.scope_id,
           CASE
             WHEN r.scope = 'customer_group' THEN (SELECT name FROM cs_main.cs_price_group WHERE id_group = r.scope_id)
             WHEN r.scope = 'carrier'        THEN (SELECT name FROM cs_main.ps_carrier      WHERE id_carrier = r.scope_id)
             WHEN r.scope = 'zone'           THEN (SELECT name FROM cs_main.ps_zone         WHERE id_zone = r.scope_id)
             ELSE 'Tous'
           END AS scope_label,
           r.threshold_type,
           r.threshold_value,
           r.priority,
           r.active
      FROM cs_main.cs_freight_rule r
     ORDER BY r.priority DESC, r.id_rule ASC
  `)
  const rows = (result as any) as any[]
  return rows.map((r) => ({
    id: Number(r.id_rule),
    label: String(r.label),
    scope: r.scope as FreightScope,
    scopeId: Number(r.scope_id),
    scopeLabel: String(r.scope_label ?? 'Tous'),
    thresholdType: r.threshold_type as FreightThresholdType,
    thresholdValue: Number(r.threshold_value),
    priority: Number(r.priority),
    active: Number(r.active),
  }))
}

/**
 * List active rules — used by the resolution solver.
 * Tri : priority DESC, id ASC.
 */
export async function listActiveFreightRules(
  _ctx: FreightContext = {},
): Promise<FreightRuleItem[]> {
  const result = await usePocPg().execute<any>(sql`
    SELECT r.id_rule,
           r.label,
           r.scope,
           r.scope_id,
           r.threshold_type,
           r.threshold_value,
           r.priority
      FROM cs_main.cs_freight_rule r
     WHERE r.active = 1
     ORDER BY r.priority DESC, r.id_rule ASC
  `)
  const rows = (result as any) as any[]
  return rows.map((r) => ({
    id: Number(r.id_rule),
    label: String(r.label),
    scope: r.scope as FreightScope,
    scopeId: Number(r.scope_id),
    thresholdType: r.threshold_type as FreightThresholdType,
    thresholdValue: Number(r.threshold_value),
    priority: Number(r.priority),
    active: 1,
  }))
}

export interface CreateFreightRuleInput {
  label: string
  scope?: FreightScope
  scopeId?: number
  thresholdType?: FreightThresholdType
  thresholdValue: number
  priority?: number
  active?: number
}

export async function createFreightRule(
  input: CreateFreightRuleInput,
  _ctx: FreightContext = {},
): Promise<void> {
  const scope = input.scope || 'all'
  const scopeId = input.scopeId ?? 0
  const thresholdType = input.thresholdType || 'amount_ht'
  const thresholdValue = String(input.thresholdValue)
  const priority = input.priority ?? 0
  const active = input.active ?? 1

  await usePocPg().execute<any>(sql`
    INSERT INTO cs_main.cs_freight_rule
      (label, scope, scope_id, threshold_type, threshold_value, priority, active, date_add, date_upd)
    VALUES
      (${input.label}, ${scope}, ${scopeId}, ${thresholdType}, ${thresholdValue}, ${priority}, ${active}, NOW(), NOW())
  `)
}

export type UpdateFreightRuleInput = Partial<CreateFreightRuleInput>

const UPDATE_COLS: Record<keyof UpdateFreightRuleInput, string> = {
  label: 'label',
  scope: 'scope',
  scopeId: 'scope_id',
  thresholdType: 'threshold_type',
  thresholdValue: 'threshold_value',
  priority: 'priority',
  active: 'active',
}

export async function updateFreightRule(
  id: number,
  input: UpdateFreightRuleInput,
  _ctx: FreightContext = {},
): Promise<void> {
  const setFragments: any[] = []
  for (const k of Object.keys(input) as Array<keyof UpdateFreightRuleInput>) {
    if (input[k] === undefined) continue
    const col = UPDATE_COLS[k]
    if (!col) continue
    const value = (k === 'thresholdValue') ? String(input[k]) : (input[k] as any)
    setFragments.push(sql`${sql.raw(`"${col}"`)} = ${value}`)
  }
  if (!setFragments.length) return
  setFragments.push(sql`date_upd = NOW()`)

  // Compose la liste SET à coups de virgules
  const setSql = setFragments.reduce((acc, frag, i) => {
    return i === 0 ? frag : sql`${acc}, ${frag}`
  })

  await usePocPg().execute<any>(sql`
    UPDATE cs_main.cs_freight_rule
       SET ${setSql}
     WHERE id_rule = ${id}
  `)
}

export async function deleteFreightRule(id: number, _ctx: FreightContext = {}): Promise<void> {
  await usePocPg().execute<any>(sql`
    DELETE FROM cs_main.cs_freight_rule WHERE id_rule = ${id}
  `)
}

/**
 * Resolve the winning rule for a given cart.
 * Eligibility:
 * - scope=all                          → always applicable
 * - scope=customer_group & group       → applicable if scopeId=group
 * - scope=carrier & carrier            → applicable if scopeId=carrier
 * - scope=zone & zone                  → applicable if scopeId=zone
 * Seuil :
 *   - amount_ht  → amount  >= threshold
 *   - weight_kg  → weight  >= threshold
 *   - pallets    → pallets >= threshold
 * Return the first eligible rule (rules are already sorted by priority DESC).
 */
export interface FreightResolveInput {
  amount?: number
  weight?: number
  pallets?: number
  group?: number
  carrier?: number
  zone?: number
}

export interface FreightResolveResult {
  franco: boolean
  winner: FreightRuleItem | null
  eligible: FreightRuleItem[]
  inputs: Required<FreightResolveInput>
}

export async function resolveFreightRule(
  input: FreightResolveInput,
  ctx: FreightContext = {},
): Promise<FreightResolveResult> {
  const inputs = {
    amount: Number(input.amount ?? 0),
    weight: Number(input.weight ?? 0),
    pallets: Number(input.pallets ?? 0),
    group: Number(input.group ?? 0),
    carrier: Number(input.carrier ?? 0),
    zone: Number(input.zone ?? 0),
  }

  const rules = await listActiveFreightRules(ctx)
  const eligible: FreightRuleItem[] = []

  for (const r of rules) {
    let scopeOk = false
    if (r.scope === 'all') scopeOk = true
    else if (r.scope === 'customer_group' && inputs.group && r.scopeId === inputs.group) scopeOk = true
    else if (r.scope === 'carrier' && inputs.carrier && r.scopeId === inputs.carrier) scopeOk = true
    else if (r.scope === 'zone' && inputs.zone && r.scopeId === inputs.zone) scopeOk = true
    if (!scopeOk) continue

    let thrOk = false
    if (r.thresholdType === 'amount_ht' && inputs.amount >= r.thresholdValue) thrOk = true
    if (r.thresholdType === 'weight_kg' && inputs.weight >= r.thresholdValue) thrOk = true
    if (r.thresholdType === 'pallets' && inputs.pallets >= r.thresholdValue) thrOk = true

    if (thrOk) eligible.push(r)
  }

  const winner = eligible[0] || null
  return { franco: !!winner, winner, eligible, inputs }
}
