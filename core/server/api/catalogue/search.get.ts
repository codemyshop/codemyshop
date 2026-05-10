/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /api/catalogue/search?q=dattes&clientId=example-shop&limit=50&lang=en&mode=hybrid
 *
 * Search for multilingual products in direct DB (doctrine "Zero webservice"):
 * PrestaShop » 2026-04-22).
 *
 * Modes (search-boost L2) :
 * - `lex`: ILIKE on name + reference + description_short, ranked
 * by trigram similarity. Backward compat with historical usage.
 * - `sem`: pgvector cosine on cs_product_embedding (Mistral 1024d).
 * For debug / qualitative comparison in the backoffice.
 * - `hybrid`: Reciprocal Rank Fusion lex+sem (k=60). If the embedding query
 * fails (key missing, API down), automatic fallback to lex.
 *
 * Resolution mode:
 * 1. `?mode=…` explicit query param (for debug / A/B test).
 * 2. Otherwise `ps_configuration.AC_SEARCH_MODE` (adjustable from the hub
 * `/hub/products/search-boost` → Semantic tab).
 * 3. Otherwise `'lex'` (zero behavior change compat if the key
 * has never been seeded).
 *
 * `ps_alias` mapping preserved in pre-processing for common typos.
 */
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

const RRF_K = 60          // constante standard RRF
const TOPN_PER_SOURCE = 50 // top-N que chaque source (lex / sem) contribue à la fusion
const VALID_MODES = ['lex', 'sem', 'hybrid'] as const

/**
 * Resolves the active mode: explicit query param > ps_configuration.AC_SEARCH_MODE > 'lex'.
 * One SELECT per query (index on native PS ps_configuration.name, ~µs).
 */
async function resolveSearchMode(db: PgAdapterClient, queryMode: unknown): Promise<string> {
  const fromQuery = String(queryMode || '').toLowerCase()
  if (VALID_MODES.includes(fromQuery as any)) return fromQuery
  try {
    const row = await db.get<{ value: string | null }>(
      `SELECT value FROM ps_configuration WHERE name = 'AC_SEARCH_MODE' LIMIT 1`,
    )
    const fromDb = String(row?.value || '').toLowerCase()
    if (VALID_MODES.includes(fromDb as any)) return fromDb
  } catch { /* table absente / DB down → lex */ }
  return 'lex'
}

export default defineEventHandler(async (event) => {
  const { q, clientId, limit, mode } = getQuery(event)
  if (!q) return { products: [] }

  const idLang = await resolveIdLang(event)
  const lim = Math.min(Math.max(Number(limit) || 50, 1), 100)
  const db = clientId ? useClientDbById(String(clientId)) : useClientDb(event)
  const requestedMode = await resolveSearchMode(db, mode)

  // ── ps_alias mapping (token-by-token, typos courantes) ──────────────
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
    } catch { /* ps_alias absent : on garde rawTerms */ }
  }
  const finalQuery = mappedTerms.join(' ')
  const like = `%${finalQuery.replace(/[%_]/g, '\\$&')}%`

  // ── Resolved mode (can downgrade to lex if embed fails) ─────────
  let resolvedMode: 'lex' | 'sem' | 'hybrid' = 'lex'
  let queryVector: string | null = null

  if (requestedMode === 'sem' || requestedMode === 'hybrid') {
    const v = await embedQuery(finalQuery)
    if (v) {
      queryVector = toPgVector(v)
      resolvedMode = requestedMode as 'sem' | 'hybrid'
    } else {
      // Graceful fallback: embed unavailable → pure lex (never a 500 error)
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

// ──────────────────────────────────────────────────────────────────────
// Lexical (backward compat, ILIKE + trigram similarity ranking)
// ──────────────────────────────────────────────────────────────────────

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

// ──────────────────────────────────────────────────────────────────────
// Semantic (pgvector cosine pur)
// ──────────────────────────────────────────────────────────────────────

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

// ──────────────────────────────────────────────────────────────────────
// Hybrid (RRF lex + sem)
//
// Reciprocal Rank Fusion: for each product present in one (or both
// two) sources, score = Σ 1/(K + rank_in_source). Robust because insensitive
// to different scales (cosine 0-1 vs trigram 0-1) and favors
// products that appear high in BOTH sources.
// ──────────────────────────────────────────────────────────────────────

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
      idLang, like, like, like, like, like, TOPN_PER_SOURCE,    // CTE lex
      queryVector, idLang, queryVector, TOPN_PER_SOURCE,         // CTE sem
      RRF_K, RRF_K,                                              // CTE fused
      idLang, lim,                                               // SELECT final
    ],
  )
}
