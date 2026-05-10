/**
 *
 * Avatars facade — persona definitions for cover generation.
 *
 * Surface :
 *  - getAvatarDefinitionForCover(idAvatar) — lit personas + page_type_expression_map
 *
 * Note: no Drizzle schema (drift tolerated) — the table is owned by the
 * PrestaShop ac_avatars module, content serialized in JSON. Minimal facade for the
 * consumer cross-domain (generate-cover).
 */

import { sql } from 'drizzle-orm'
import { usePocPg } from '../../../../server/db/drizzle-pg'

interface AvatarsContext {
  event?: any
  clientId?: string
}

export interface AvatarDefinitionRow {
  personas: string | null
  page_type_expression_map: string | null
}

export async function getAvatarDefinitionForCover(
  idAvatar: number,
  _ctx: AvatarsContext = {},
): Promise<AvatarDefinitionRow | null> {
  const rows = await usePocPg().execute<AvatarDefinitionRow>(sql`
    SELECT personas, page_type_expression_map
      FROM cs_main.cs_avatar_definition
     WHERE id_avatar_definition = ${idAvatar} AND active = 1
     LIMIT 1
  `)
  return ((rows as any[])[0] as AvatarDefinitionRow) ?? null
}
