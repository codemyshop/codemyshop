/**
 *
 * ac_playbook facade — BO playbooks (operational procedures by role).
 *
 * Surface :
 *  - getPlaybookBySlug(slug)
 *  - listPlaybooks({ role?, status })
 * - findPlaybookByFeatureRole(featureId, role) — for /api/bo/playbooks/by-route
 * - upsertPlaybook(input) — INSERT/UPDATE if id present
 *  - replacePlaybookRoles(idPlaybook, roles)
 *
 * Task #38 — 100% PostgreSQL facade (schema cs_main, postgres-js).
 */

import { sql } from 'drizzle-orm'
import { usePocPg } from '../../../../server/db/drizzle-pg'

interface PlaybookContext {
  event?: any
  clientId?: string
}

// PlaybookContext est conservé pour compat-API mais ignoré : runtime PG single-tenant.
export async function getPlaybookBySlug(
  slug: string,
  _ctx: PlaybookContext = {},
): Promise<any | null> {
  const result = await usePocPg().execute<any>(sql`
    SELECT p.*, STRING_AGG(pr.role, ',' ORDER BY pr.role) AS roles
      FROM cs_main.cs_playbook p
      LEFT JOIN cs_main.cs_playbook_role pr ON pr.id_ac_playbook = p.id_ac_playbook
     WHERE p.slug = ${slug}
     GROUP BY p.id_ac_playbook
  `)
  const rows = (result as any) as any[]
  return rows[0] || null
}

export interface ListPlaybooksFilter {
  role?: string
  status: string
}

export async function listPlaybooks(
  f: ListPlaybooksFilter,
  _ctx: PlaybookContext = {},
): Promise<any[]> {
  const d = usePocPg()
  if (f.role) {
    const result = await d.execute<any>(sql`
      SELECT p.*, STRING_AGG(pr.role, ',' ORDER BY pr.role) AS roles
        FROM cs_main.cs_playbook p
        JOIN cs_main.cs_playbook_role pr ON pr.id_ac_playbook = p.id_ac_playbook
       WHERE p.status = ${f.status}
         AND p.id_ac_playbook IN (
           SELECT id_ac_playbook FROM cs_main.cs_playbook_role WHERE role = ${f.role}
         )
       GROUP BY p.id_ac_playbook
       ORDER BY p.position, p.date_add DESC
    `)
    return (result as any) as any[]
  }
  const where = f.status !== 'all' ? sql`WHERE p.status = ${f.status}` : sql``
  const result = await d.execute<any>(sql`
    SELECT p.*, STRING_AGG(pr.role, ',' ORDER BY pr.role) AS roles
      FROM cs_main.cs_playbook p
      LEFT JOIN cs_main.cs_playbook_role pr ON pr.id_ac_playbook = p.id_ac_playbook
      ${where}
     GROUP BY p.id_ac_playbook
     ORDER BY p.position, p.date_add DESC
  `)
  return (result as any) as any[]
}

export async function findPlaybookByFeatureRole(
  featureId: number,
  role: string | null,
  _ctx: PlaybookContext = {},
): Promise<any | null> {
  const d = usePocPg()
  // feature_id est varchar(64) côté PG → cast explicite côté JS pour comparaison saine.
  const featureIdStr = String(featureId)
  if (role) {
    const result = await d.execute<any>(sql`
      SELECT p.*, STRING_AGG(pr.role, ',' ORDER BY pr.role) AS roles
        FROM cs_main.cs_playbook p
        LEFT JOIN cs_main.cs_playbook_role pr ON pr.id_ac_playbook = p.id_ac_playbook
       WHERE p.feature_id = ${featureIdStr} AND p.status = 'published'
         AND EXISTS (
           SELECT 1 FROM cs_main.cs_playbook_role r
            WHERE r.id_ac_playbook = p.id_ac_playbook AND r.role = ${role}
         )
       GROUP BY p.id_ac_playbook
       ORDER BY p.position, p.date_upd DESC LIMIT 1
    `)
    const rows = (result as any) as any[]
    return rows[0] || null
  }
  const result = await d.execute<any>(sql`
    SELECT p.*, STRING_AGG(pr.role, ',' ORDER BY pr.role) AS roles
      FROM cs_main.cs_playbook p
      LEFT JOIN cs_main.cs_playbook_role pr ON pr.id_ac_playbook = p.id_ac_playbook
     WHERE p.feature_id = ${featureIdStr} AND p.status = 'published'
     GROUP BY p.id_ac_playbook
     ORDER BY p.position, p.date_upd DESC LIMIT 1
  `)
  const rows = (result as any) as any[]
  return rows[0] || null
}

export interface UpsertPlaybookInput {
  id?: number
  title: string
  slug: string
  description: string
  contentJson: string
  status: string
  position: number
  createdBy: number | null
}

export async function upsertPlaybook(
  input: UpsertPlaybookInput,
  _ctx: PlaybookContext = {},
): Promise<number> {
  const d = usePocPg()
  if (input.id) {
    await d.execute(sql`
      UPDATE cs_main.cs_playbook
         SET title = ${input.title}, slug = ${input.slug},
             description = ${input.description}, content_json = ${input.contentJson},
             status = ${input.status}, position = ${input.position},
             date_upd = CURRENT_TIMESTAMP
       WHERE id_ac_playbook = ${input.id}
    `)
    return input.id
  }
  const ins = await d.execute<any>(sql`
    INSERT INTO cs_main.cs_playbook
      (title, slug, description, content_json, status, position, created_by, date_add, date_upd)
    VALUES
      (${input.title}, ${input.slug}, ${input.description}, ${input.contentJson},
       ${input.status}, ${input.position}, ${input.createdBy},
       CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    RETURNING id_ac_playbook AS "id"
  `)
  const rows = (ins as any) as any[]
  return Number(rows[0]?.id || 0)
}

export async function replacePlaybookRoles(
  idPlaybook: number,
  roles: string[],
  _ctx: PlaybookContext = {},
): Promise<void> {
  const d = usePocPg()
  await d.execute(sql`
    DELETE FROM cs_main.cs_playbook_role WHERE id_ac_playbook = ${idPlaybook}
  `)
  for (const role of roles) {
    await d.execute(sql`
      INSERT INTO cs_main.cs_playbook_role (id_ac_playbook, role)
      VALUES (${idPlaybook}, ${role.toUpperCase()})
      ON CONFLICT DO NOTHING
    `)
  }
}
