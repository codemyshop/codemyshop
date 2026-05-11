

import { sql } from 'drizzle-orm'
import { usePocPg } from '../db/drizzle-pg'

function parseJson<T = unknown>(raw: any, fallback: T): T {
  if (raw == null || raw === '') return fallback
  if (typeof raw === 'object') return raw as T
  try { return JSON.parse(String(raw)) as T } catch { return fallback }
}

export interface DesignSystemRow {
  id: string
  name: string
  description: string
  tokens: Record<string, string>
}

export async function listDesignSystems(): Promise<DesignSystemRow[]> {
  const result = await usePocPg().execute(sql`
    SELECT system_id AS "systemId", name, description, tokens
      FROM cs_main.cs_marketplace_design_system
     WHERE active = 1
     ORDER BY name ASC
  `) as any[]
  return result.map((r): DesignSystemRow => ({
    id: String(r.systemId || ''),
    name: String(r.name || ''),
    description: String(r.description || ''),
    tokens: parseJson<Record<string, string>>(r.tokens, {}),
  }))
}
