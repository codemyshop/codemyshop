/**
 *
 * Megamenu facade — configurable navigation menu. Sources of truth:
 * `cs_megamenu` + `cs_megamenu_lang`, owned by ac_megamenu.
 * Tenant-aware via `client_id` on the shared database (PostgreSQL,
 * schema `cs_main`) shared by multiple clients.
 */

import { sql } from 'drizzle-orm'
import { usePocPg } from '../../../../server/db/drizzle-pg'

export type MegamenuType = 'link' | 'megamenu' | 'dropdown'

export interface MegamenuJoinedRow {
  idMegamenu: number
  clientId: string
  parentId: number | null
  type: MegamenuType
  href: string | null
  icon: string | null
  styleJson: string | null
  gridColumns: number | null
  cssClass: string | null
  psCategoryId: number | null
  showPsChildren: number
  position: number
  label: string | null
  description: string | null
  badge: string | null
  groupTitle: string | null
  labelFr: string | null
  descriptionFr: string | null
  badgeFr: string | null
  groupTitleFr: string | null
}

interface MegamenuContext { event?: any; clientId?: string }

/**
 * Loads the complete menu of a tenant for the given language, with fallback
 * automatic to id_lang=1 (master). Sorted by parent_id then position for
 * tree reconstruction on the caller side.
 */
export async function loadMegamenuTreeRows(
  clientId: string,
  idLang: number,
  _ctx: MegamenuContext = {},
): Promise<MegamenuJoinedRow[]> {
  const r = await usePocPg().execute<any>(sql`
    SELECT m.id_megamenu, m.client_id, m.parent_id, m.type, m.href,
           m.icon, m.style_json, m.grid_columns, m.css_class,
           m.ps_category_id, m.show_ps_children, m.position,
           ml.label       AS label,
           ml.description AS description,
           ml.badge       AS badge,
           ml.group_title AS group_title,
           mlf.label       AS label_fr,
           mlf.description AS description_fr,
           mlf.badge       AS badge_fr,
           mlf.group_title AS group_title_fr
      FROM cs_main.cs_megamenu m
 LEFT JOIN cs_main.cs_megamenu_lang ml  ON ml.id_megamenu  = m.id_megamenu AND ml.id_lang = ${idLang}
 LEFT JOIN cs_main.cs_megamenu_lang mlf ON mlf.id_megamenu = m.id_megamenu AND mlf.id_lang = 1
     WHERE m.active = 1
       AND m.client_id = ${clientId}
     ORDER BY CASE WHEN m.parent_id IS NULL THEN 0 ELSE 1 END,
              m.parent_id, m.position
  `)
  const rows = r as any[]
  return rows.map((row) => ({
    idMegamenu: Number(row.id_megamenu),
    clientId: row.client_id,
    parentId: row.parent_id == null ? null : Number(row.parent_id),
    type: row.type as MegamenuType,
    href: row.href,
    icon: row.icon,
    styleJson: row.style_json,
    gridColumns: row.grid_columns == null ? null : Number(row.grid_columns),
    cssClass: row.css_class,
    psCategoryId: row.ps_category_id == null ? null : Number(row.ps_category_id),
    showPsChildren: Number(row.show_ps_children),
    position: Number(row.position),
    label: row.label,
    description: row.description,
    badge: row.badge,
    groupTitle: row.group_title,
    labelFr: row.label_fr,
    descriptionFr: row.description_fr,
    badgeFr: row.badge_fr,
    groupTitleFr: row.group_title_fr,
  }))
}

export interface InsertMegamenuRowInput {
  clientId: string
  parentId: number | null
  type: MegamenuType
  href: string | null
  icon?: string | null
  styleJson?: string | null
  gridColumns?: number | null
  cssClass?: string | null
  psCategoryId?: number | null
  showPsChildren?: number
  position: number
}

export async function insertMegamenuRow(
  input: InsertMegamenuRowInput,
  _ctx: MegamenuContext = {},
): Promise<number> {
  const r = await usePocPg().execute<{ id_megamenu: number }>(sql`
    INSERT INTO cs_main.cs_megamenu
      (client_id, parent_id, type, href, icon, style_json, grid_columns,
       css_class, ps_category_id, show_ps_children, position, active,
       date_add, date_upd)
    VALUES
      (${input.clientId}, ${input.parentId}, ${input.type}, ${input.href},
       ${input.icon ?? null}, ${input.styleJson ?? null},
       ${input.gridColumns ?? null}, ${input.cssClass ?? null},
       ${input.psCategoryId ?? null}, ${input.showPsChildren ?? 0},
       ${input.position}, 1, NOW(), NOW())
    RETURNING id_megamenu
  `)
  return Number((r as any[])[0]?.id_megamenu ?? 0)
}

export async function upsertMegamenuLangRow(
  idMegamenu: number,
  idLang: number,
  label: string,
  description: string | null,
  badge: string | null,
  groupTitle: string | null,
  _ctx: MegamenuContext = {},
): Promise<void> {
  await usePocPg().execute(sql`
    INSERT INTO cs_main.cs_megamenu_lang
      (id_megamenu, id_lang, label, description, badge, group_title)
    VALUES (${idMegamenu}, ${idLang}, ${label}, ${description}, ${badge}, ${groupTitle})
    ON CONFLICT (id_megamenu, id_lang) DO UPDATE SET
      label = EXCLUDED.label,
      description = EXCLUDED.description,
      badge = EXCLUDED.badge,
      group_title = EXCLUDED.group_title
  `)
}

/**
 * Complete wipe of a client's menu (CASCADE on _lang via FK).
 * PostgreSQL note: FK CASCADE was not replicated by an earlier migration — we delete
 * explicitly the _lang rows first to maintain consistency.
 */
export async function deleteMegamenuForClient(
  clientId: string,
  _ctx: MegamenuContext = {},
): Promise<void> {
  const pg = usePocPg()
  await pg.execute(sql`
    DELETE FROM cs_main.cs_megamenu_lang
     WHERE id_megamenu IN (
       SELECT id_megamenu FROM cs_main.cs_megamenu WHERE client_id = ${clientId}
     )
  `)
  await pg.execute(sql`
    DELETE FROM cs_main.cs_megamenu WHERE client_id = ${clientId}
  `)
}
