

import { useClientDb, useClientDbById } from '~/server/utils/db'
import type { PgAdapterClient } from '~/server/utils/db-pg-adapter'
import { resolveIdLang } from '~/server/utils/lang'
import { buildProductImage } from '~/server/utils/ps-image'
import { embedQuery, toPgVector } from '~/server/utils/mistral-embed'

interface SearchRow {
  id_product: number
  reference: string
  name: string
  link_rewrite: string
  price: number
  id_image: number | null
  score?: number
}

const fmtEur = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)

const RRF_K = 60          
const TOPN_PER_SOURCE = 50 
const VALID_MODES = ['lex', 'sem', 'hybrid'] as const

async function resolveSearchMode(db: PgAdapterClient, queryMode: unknown): Promise<string> {
  const fromQuery = String(queryMode || '').toLowerCase()
  if (VALID_MODES.includes(fromQuery as any)) return fromQuery
  try {
    const row = await db.get<{ value: string | null }>(
      `SELECT value FROM ps_configuration WHERE name = 'AC_SEARCH_MODE' LIMIT 1`,
    )
    const fromDb = String(row?.value || '').toLowerCase()
    if (VALID_MODES.includes(fromDb as any)) return fromDb
  } catch {  }
  return 'lex'
}

export default defineEventHandler(async (event) => {
  const { q, clientId, limit, mode } = getQuery(event)
  if (!q) return { products: [] }

  const idLang = await resolveIdLang(event)
  const lim = Math.min(Math.max(Number(limit) || 50, 1), 100)
  const db = clientId ? useClientDbById(String(clientId)) : useClientDb(event)
  const requestedMode = await resolveSearchMode(db, mode)

  
  const rawTerms = String(q).trim().split(/\s+/).filter(Boolean)
  let mappedTerms = rawTerms
  if (rawTerms.length) {
    try {
      const aliasRows = await db.query<{ alias: string; search: string }>(
        `SELECT alias, search FROM ps_alias WHERE active = 1
          AND LOWER(alias) IN (${rawTerms.map(() => '?').join(',')})`,
        rawTerms.map(t => t.toLowerCase()),
      )
      if (aliasRows.length) {
        const aliasMap = new Map(aliasRows.map(r => [r.alias.toLowerCase(), r.search]))
        mappedTerms = rawTerms.map(t => aliasMap.get(t.toLowerCase()) || t)
      }
    } catch {  }
  }
  const finalQuery = mappedTerms.join(' ')
  const like = `%${finalQuery.replace(/[%_]/g, '\\$&')}%`

  
  let resolvedMode: 'lex' | 'sem' | 'hybrid' = 'lex'
  let queryVector: string | null = null

  if (requestedMode === 'sem' || requestedMode === 'hybrid') {
    const v = await embedQuery(finalQuery)
    if (v) {
      queryVector = toPgVector(v)
      resolvedMode = requestedMode as 'sem' | 'hybrid'
    } else {
      
      resolvedMode = 'lex'
    }
  }

  try {
    const rows = resolvedMode === 'lex'
      ? await runLexicalSearch(db, idLang, like, lim)
      : resolvedMode === 'sem'
        ? await runSemanticSearch(db, idLang, queryVector!, lim)
        : await runHybridSearch(db, idLang, like, queryVector!, lim)

    const products = rows.map((r) => {
      const img = buildProductImage(r.id_image, r.link_rewrite)
      return {
        id: Number(r.id_product),
        name: String(r.name || ''),
        ref: String(r.reference || ''),
        price: fmtEur(Number(r.price)),
        priceRaw: Number(r.price),
        image: img?.src,
        imageSrcset: img?.srcset,
        imageFallback: img?.fallback,
        active: true,
        ...(r.score !== undefined ? { score: Number(r.score) } : {}),
      }
    })

    return { products, mode: resolvedMode, requested: requestedMode }
  } catch (err: any) {
    if (err?.code === 'ER_NO_SUCH_TABLE' || err?.errno === 1146) return { products: [] }
    console.error('[search] DB error:', err?.message)
    return { products: [] }
  }
})

async function runLexicalSearch(db: PgAdapterClient, idLang: number, like: string, lim: number): Promise<SearchRow[]> {
  return db.query<SearchRow>(
    `SELECT id_product, reference, price, name, link_rewrite, id_image FROM (
       SELECT DISTINCT p.id_product, p.reference, ps.price,
              COALESCE(pl.name, plf.name, '') AS name,
              COALESCE(pl.link_rewrite, plf.link_rewrite, '') AS link_rewrite,
              (SELECT id_image FROM ps_image WHERE id_product = p.id_product AND cover = 1 LIMIT 1) AS id_image
         FROM ps_product p
         JOIN ps_product_shop ps ON ps.id_product = p.id_product AND ps.id_shop = 1
    LEFT JOIN ps_product_lang pl  ON pl.id_product  = p.id_product AND pl.id_lang  = ? AND pl.id_shop = 1
    LEFT JOIN ps_product_lang plf ON plf.id_product = p.id_product AND plf.id_lang = 1 AND plf.id_shop = 1
        WHERE p.active = 1 AND ps.active = 1
          AND (pl.name ILIKE ? OR plf.name ILIKE ? OR p.reference ILIKE ?
               OR pl.description_short ILIKE ? OR plf.description_short ILIKE ?)
     ) sr
     ORDER BY name
     LIMIT ?`,
    [idLang, like, like, like, like, like, lim],
  )
}

async function runSemanticSearch(db: PgAdapterClient, idLang: number, queryVector: string, lim: number): Promise<SearchRow[]> {
  return db.query<SearchRow>(
    `SELECT p.id_product, p.reference, ps.price,
            COALESCE(pl.name, plf.name, '') AS name,
            COALESCE(pl.link_rewrite, plf.link_rewrite, '') AS link_rewrite,
            (SELECT id_image FROM ps_image WHERE id_product = p.id_product AND cover = 1 LIMIT 1) AS id_image,
            (1.0 - (e.embedding <=> ?::vector)) AS score
       FROM cs_product_embedding e
       JOIN ps_product p          ON p.id_product = e.id_product AND p.active = 1
       JOIN ps_product_shop ps    ON ps.id_product = p.id_product AND ps.id_shop = 1 AND ps.active = 1
  LEFT JOIN ps_product_lang pl    ON pl.id_product = p.id_product  AND pl.id_lang  = ? AND pl.id_shop = 1
  LEFT JOIN ps_product_lang plf   ON plf.id_product = p.id_product AND plf.id_lang = 1 AND plf.id_shop = 1
      WHERE e.id_lang = ?
      ORDER BY e.embedding <=> ?::vector
      LIMIT ?`,
    [queryVector, idLang, idLang, queryVector, lim],
  )
}

async function runHybridSearch(
  db: PgAdapterClient,
  idLang: number,
  like: string,
  queryVector: string,
  lim: number,
): Promise<SearchRow[]> {
  return db.query<SearchRow>(
    `WITH lex AS (
       SELECT id_product, ROW_NUMBER() OVER () AS rk
         FROM (
           SELECT DISTINCT p.id_product
             FROM ps_product p
             JOIN ps_product_shop ps ON ps.id_product = p.id_product AND ps.id_shop = 1
        LEFT JOIN ps_product_lang pl  ON pl.id_product  = p.id_product AND pl.id_lang  = ? AND pl.id_shop = 1
        LEFT JOIN ps_product_lang plf ON plf.id_product = p.id_product AND plf.id_lang = 1 AND plf.id_shop = 1
            WHERE p.active = 1 AND ps.active = 1
              AND (pl.name ILIKE ? OR plf.name ILIKE ? OR p.reference ILIKE ?
                   OR pl.description_short ILIKE ? OR plf.description_short ILIKE ?)
            LIMIT ?
         ) sub
     ),
     sem AS (
       SELECT id_product, ROW_NUMBER() OVER (ORDER BY embedding <=> ?::vector) AS rk
         FROM cs_product_embedding
        WHERE id_lang = ?
        ORDER BY embedding <=> ?::vector
        LIMIT ?
     ),
     fused AS (
       SELECT COALESCE(l.id_product, s.id_product) AS id_product,
              (CASE WHEN l.rk IS NOT NULL THEN 1.0 / (?::float + l.rk) ELSE 0 END
             + CASE WHEN s.rk IS NOT NULL THEN 1.0 / (?::float + s.rk) ELSE 0 END) AS score
         FROM lex l FULL OUTER JOIN sem s USING (id_product)
     )
     SELECT p.id_product, p.reference, ps.price,
            COALESCE(pl.name, plf.name, '') AS name,
            COALESCE(pl.link_rewrite, plf.link_rewrite, '') AS link_rewrite,
            (SELECT id_image FROM ps_image WHERE id_product = p.id_product AND cover = 1 LIMIT 1) AS id_image,
            f.score
       FROM fused f
       JOIN ps_product p          ON p.id_product = f.id_product AND p.active = 1
       JOIN ps_product_shop ps    ON ps.id_product = p.id_product AND ps.id_shop = 1 AND ps.active = 1
  LEFT JOIN ps_product_lang pl    ON pl.id_product = p.id_product  AND pl.id_lang  = ? AND pl.id_shop = 1
  LEFT JOIN ps_product_lang plf   ON plf.id_product = p.id_product AND plf.id_lang = 1 AND plf.id_shop = 1
      ORDER BY f.score DESC
      LIMIT ?`,
    [
      idLang, like, like, like, like, like, TOPN_PER_SOURCE,    
      queryVector, idLang, queryVector, TOPN_PER_SOURCE,         
      RRF_K, RRF_K,                                              
      idLang, lim,                                               
    ],
  )
}
