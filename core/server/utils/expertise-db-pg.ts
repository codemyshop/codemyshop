/**
 *
 * Facade ac_expertise on the Postgres side — Task #38 Phase 1 step 6,
 * flag PG_ENABLED_DOMAINS=expertise.
 *
 * Read-only surface (corresponding to expertise-db.ts MariaDB): list + detail
 * by slug. The table contains JSON technical debt (tags / ps_versions / faq) already
 * documented on the MariaDB side — we parse at the mapping layer, we don't normalize here.
 */

import { sql } from 'drizzle-orm'
import { usePocPg } from '../db/drizzle-pg'
import type { ExpertiseFull, ExpertiseSummary, ListExpertiseFilter } from './expertise-db'

function parseJson<T = unknown>(raw: any, fallback: T): T {
  if (raw == null || raw === '') return fallback
  try { return JSON.parse(String(raw)) as T } catch { return fallback }
}

function mapSummary(r: any): ExpertiseSummary {
  const tags = parseJson<string[]>(r.tags, [])
  const psVersions = parseJson<string[]>(r.ps_versions, [])
  const faqArr = parseJson<any[]>(r.faq, [])
  return {
    title: String(r.title || ''),
    slug: String(r.slug || ''),
    metaDescription: String(r.meta_description || ''),
    category: String(r.category || 'general'),
    subcategory: String(r.subcategory || ''),
    tags,
    difficulty: String(r.difficulty || 'intermediaire'),
    psVersions,
    tldr: String(r.tldr || ''),
    faqCount: faqArr.length,
    generatedAt: r.generated_at ? new Date(r.generated_at).toISOString() : '',
    publishDate: r.publish_date
      ? new Date(r.publish_date).toISOString()
      : (r.generated_at ? new Date(r.generated_at).toISOString() : ''),
    url: `/expertise/prestashop/${String(r.category || 'general')}/${String(r.slug || '')}`,
    sourceUrl: String(r.source_url || ''),
    sourceTitle: String(r.source_title || ''),
    sourceCategory: String(r.source_category || ''),
    score: Number(r.score || 0),
  }
}

function mapFull(r: any): ExpertiseFull {
  const summary = mapSummary(r)
  return {
    ...summary,
    content: String(r.content || ''),
    faq: parseJson<any[]>(r.faq, []),
  }
}

export async function listExpertisePg(filter: ListExpertiseFilter = {}): Promise<ExpertiseSummary[]> {
  const conds: any[] = [sql`active = 1`]
  if (!filter.includeFuture) {
    conds.push(sql`(publish_date IS NULL OR publish_date <= NOW())`)
  }
  if (filter.category) conds.push(sql`category = ${filter.category}`)
  if (filter.difficulty) conds.push(sql`difficulty = ${filter.difficulty}`)
  const limit = Math.max(1, Math.min(1000, Number(filter.limit || 200)))
  const result = await usePocPg().execute<any>(sql`
    SELECT * FROM cs_main.cs_expertise
     WHERE ${sql.join(conds, sql` AND `)}
     ORDER BY publish_date DESC NULLS LAST, position ASC
     LIMIT ${sql.raw(String(limit))}
  `)
  return ((result as any) as any[]).map(mapSummary)
}

export async function getExpertiseBySlugPg(slug: string): Promise<ExpertiseFull | null> {
  if (!slug) return null
  const result = await usePocPg().execute<any>(sql`
    SELECT * FROM cs_main.cs_expertise
     WHERE slug = ${slug} AND active = 1
     LIMIT 1
  `)
  const rows = (result as any) as any[]
  return rows.length ? mapFull(rows[0]) : null
}
