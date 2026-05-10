/**
 *
 * Redirect facade — consumed by the Nitro middleware `02-legacy-redirects.ts`.
 * Source of truth: `cs_redirect`, owned by the redirect module.
 *
 * 100% PostgreSQL (cs_main.cs_redirect).
 */

import { sql } from 'drizzle-orm'
import { usePocPg } from '../../../../server/db/drizzle-pg'

export type RedirectKind = 'category' | 'product' | 'manual' | 'cms' | 'brand'

export interface RedirectItem {
  sourcePath: string
  targetPath: string
  statusCode: number
  sourceKind: RedirectKind
  sourceId: number | null
}

interface RedirectContext {
  event?: any
  clientId?: string
}

/**
 * Lists all active redirects — used to warm the cache
 * of the middleware. If the table does not exist (PostgreSQL code 42P01,
 * undefined_table), returns an empty array.
 */
export async function listActiveRedirects(
  _ctx: RedirectContext = {},
): Promise<RedirectItem[]> {
  try {
    const rows = await usePocPg().execute<{
      source_path: string
      target_path: string
      status_code: number
      source_kind: string
      source_id: number | null
    }>(sql`
      SELECT source_path, target_path, status_code, source_kind, source_id
        FROM cs_main.cs_redirect
       WHERE active = 1
    `)
    return (rows as any[]).map((r) => ({
      sourcePath: r.source_path,
      targetPath: r.target_path,
      statusCode: Number(r.status_code) || 301,
      sourceKind: r.source_kind as RedirectKind,
      sourceId: r.source_id == null ? null : Number(r.source_id),
    }))
  } catch (err: any) {
    // PG : table absente = code 42P01 (undefined_table)
    if (err?.code === '42P01') return []
    throw err
  }
}
