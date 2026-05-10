/**
 *
 * Centaure POC pgvector — chantier #38 phase E.5 (criterion #2).
 *
 * Deterministic 384-dimensional pseudo-embedding (bag-of-trigrams hashed). It's a
 * placeholder that demonstrates the pgvector pipeline end-to-end (insert
 * vector, HNSW cosine index, similarity SQL). To be replaced with a
 * real semantic embedder (voyage-3, mistral-embed, gte-large) in a
 * dedicated effort — the interface will remain identical.
 *
 * Why deterministic: with the same input data the seed always produces the
 * same vectors, so the live test is reproducible. Why
 * trigrams: preserves lexical similarity (two texts sharing
 * vocabulary produce vectors close in cosine), sufficient
 * to validate the pipeline.
 */

import { sql } from 'drizzle-orm'
import { usePocPg } from '../db/drizzle-pg'

const EMBED_DIM = 384

function djb2(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return h >>> 0
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function pseudoEmbed(text: string): number[] {
  const v = new Float32Array(EMBED_DIM)
  const norm = normalize(text)
  if (!norm) return Array.from(v)

  for (let i = 0; i < norm.length - 2; i++) {
    const tri = norm.slice(i, i + 3)
    const idx = djb2(tri) % EMBED_DIM
    v[idx] += 1
  }
  for (const word of norm.split(' ')) {
    if (word.length < 4) continue
    const idx = djb2(`__w_${word}`) % EMBED_DIM
    v[idx] += 2
  }

  let l2 = 0
  for (let i = 0; i < EMBED_DIM; i++) l2 += v[i] * v[i]
  l2 = Math.sqrt(l2) || 1
  for (let i = 0; i < EMBED_DIM; i++) v[i] /= l2

  return Array.from(v)
}

function toPgVector(v: number[]): string {
  return `[${v.map((x) => x.toFixed(6)).join(',')}]`
}

export interface CentaureSearchResult {
  source_type: string
  source_id: number
  content_excerpt: string
  cosine_distance: number
}

export async function searchSimilar(
  query: string,
  limit = 5,
): Promise<CentaureSearchResult[]> {
  const embedding = toPgVector(pseudoEmbed(query))
  const safeLimit = Math.max(1, Math.min(50, Math.floor(limit)))
  const result = await usePocPg().execute<any>(sql`
    SELECT source_type,
           source_id,
           content_excerpt,
           (embedding <=> ${embedding}::vector) AS cosine_distance
      FROM cs_main.cs_centaure_embedding
     ORDER BY embedding <=> ${embedding}::vector
     LIMIT ${sql.raw(String(safeLimit))}
  `)
  return ((result as any) as any[]).map((r) => ({
    source_type: String(r.source_type),
    source_id: Number(r.source_id),
    content_excerpt: String(r.content_excerpt),
    cosine_distance: Number(r.cosine_distance),
  }))
}

export interface SeedReport {
  upserted: number
  scanned: number
}

export async function seedFromAutoblog(): Promise<SeedReport> {
  const rows = ((await usePocPg().execute<any>(sql`
    SELECT id_queue, title, content_md
      FROM cs_main.cs_autoblog_queue
     WHERE content_md IS NOT NULL
       AND LENGTH(content_md) > 200
  `)) as any) as any[]

  let upserted = 0
  for (const row of rows) {
    const id = Number(row.id_queue)
    const title = String(row.title || '')
    const content = String(row.content_md || '')
    const excerpt = (title ? title + ' — ' : '') + content.slice(0, 500)
    const v = toPgVector(pseudoEmbed(`${title} ${content}`))
    await usePocPg().execute(sql`
      INSERT INTO cs_main.cs_centaure_embedding
             (source_type, source_id, content_excerpt, embedding)
      VALUES ('autoblog', ${id}, ${excerpt}, ${v}::vector)
      ON CONFLICT (source_type, source_id) DO UPDATE
         SET content_excerpt = EXCLUDED.content_excerpt,
             embedding       = EXCLUDED.embedding,
             date_add        = now()
    `)
    upserted++
  }
  return { upserted, scanned: rows.length }
}
