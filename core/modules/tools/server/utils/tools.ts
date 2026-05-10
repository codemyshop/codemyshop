/**
 *
 * Tools — tool catalog. Source of truth:
 * `cs_tools`, owned by the tools service. Tenant-aware.
 *
 * Chantier #38 phase E — runtime PostgreSQL only (cs_main).
 * The MariaDB dual-driver branch was removed after migration.
 */

import { sql } from 'drizzle-orm'
import { usePocPg } from '../../../../server/db/drizzle-pg'

export interface ToolItem {
  id: number
  name: string
  codename: string
  icon: string | null
  flywheel: string | null
  category: string
  description: string
  results: string[]
  tags: string[]
  status: string
  position: number
}

interface ToolsContext { event?: any; clientId?: string }

function safeJsonArray(s: string | null | undefined): any[] {
  if (!s) return []
  try { return JSON.parse(s) } catch { return [] }
}

function mapToolRow(r: any): ToolItem {
  return {
    id: Number(r.id_tool ?? r.idTool),
    name: r.name,
    codename: r.codename,
    icon: r.icon,
    flywheel: r.flywheel,
    category: r.category,
    description: r.description,
    results: safeJsonArray(r.results),
    tags: safeJsonArray(r.tags),
    status: r.status,
    position: Number(r.position),
  }
}

export async function listActiveTools(_ctx: ToolsContext = {}): Promise<ToolItem[]> {
  const rows = await usePocPg().execute<any>(sql`
    SELECT * FROM cs_main.cs_tools
     WHERE active = 1
     ORDER BY position ASC, id_tool ASC
  `)
  return (rows as any[]).map(mapToolRow)
}

export async function getToolByCodename(
  codename: string,
  _ctx: ToolsContext = {},
): Promise<ToolItem | null> {
  const rows = await usePocPg().execute<any>(sql`
    SELECT * FROM cs_main.cs_tools WHERE codename = ${codename} LIMIT 1
  `)
  return (rows as any[])[0] ? mapToolRow((rows as any[])[0]) : null
}
