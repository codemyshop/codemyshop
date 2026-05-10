/**
 *
 * Nitro Task — seo:crosslinks-rebuild
 *
 * Wave 4 of task #43 (python-nitro-tasks). Refactors
 * `automation/ac_linkmap.py` which wrote to `internal_links.json` (file system,
 * unused since PHP removal on 2026-05-01) → writes DB-first to
 * `cs_crosslinks` (frozen since 2026-04-04, 72 rows).
 *
 * Semantic silo logic (1:1 port from Python):
 * - Same pillar AND same subcategory (subcat ≠ '') → same_subcat (top 3, "In the same series")
 * - Same pillar only                       → same_pillar (top 2, "On the same topic")
 * - Different pillar                                → cross_pillar (top 1, "Learn more")
 *
 * Relevance = |intersection of title words (>3 chars, lowercase, without punctuation)|.
 *
 * No shadow AUDIT_MODE: the Python implementation did not write to this table —
 * direct cutover without risk of double-write.
 */

import { defineTask } from 'nitropack/runtime'
import { skipIfNotAcInternal } from '~/server/utils/cron-context'
import { withAutomateLock } from '~/server/utils/automate-lock'
import { runAutomate, type AutomateLog } from '~/server/utils/automate-logger'
import { getPgClient } from '~/server/utils/db-pg-adapter'

const PG_SCHEMA = 'cs_main'
const DEFAULT_LANG_ID = 1

const MAX_SAME_SUBCAT  = 3
const MAX_SAME_PILLAR  = 2
const MAX_CROSS_PILLAR = 1

type Article = {
  id: number
  link_rewrite: string
  title: string
  pilier: string
  sous_cat: string
  url: string
  title_words: Set<string>
}

type CrosslinkEntry = {
  link_rewrite: string
  title: string
  url: string
  relevance: number
}

async function pgSchemaExists(schema: string): Promise<boolean> {
  const sql = getPgClient()
  const rows = await sql<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.schemata WHERE schema_name = ${schema}
    ) AS exists
  `
  return Boolean(rows[0]?.exists)
}

function extractTitleWords(title: string): Set<string> {
  if (!title) return new Set()
  const cleaned = title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
  const words = cleaned.split(/\s+/).filter((w) => w.length > 3)
  return new Set(words)
}

async function fetchArticles(log: AutomateLog): Promise<Article[]> {
  const sql = getPgClient()
  const rows = await sql<{
    id_cms: number
    link_rewrite: string
    meta_title: string
  }[]>`
    SELECT c.id_cms, cl.link_rewrite, cl.meta_title
    FROM ${sql(PG_SCHEMA)}.ps_cms c
    JOIN ${sql(PG_SCHEMA)}.ps_cms_lang cl
      ON c.id_cms = cl.id_cms
     AND cl.id_lang = ${DEFAULT_LANG_ID}
    WHERE c.active = 1
      AND cl.link_rewrite LIKE '%--%'
  `

  log.count('articles_fetched', rows.length)

  const articles: Article[] = []
  let skippedNoDashes = 0

  for (const row of rows) {
    const lr = row.link_rewrite
    const parts = lr.split('--')
    if (parts.length < 2) {
      skippedNoDashes++
      continue
    }
    const pilier = parts[0]
    const sous_cat = parts.length >= 3 ? parts[1] : ''
    const url = '/blog/' + parts.join('/')

    articles.push({
      id: row.id_cms,
      link_rewrite: lr,
      title: row.meta_title || '',
      pilier,
      sous_cat,
      url,
      title_words: extractTitleWords(row.meta_title || ''),
    })
  }

  if (skippedNoDashes > 0) log.count('articles_skipped_malformed', skippedNoDashes)
  return articles
}

function buildCrosslinks(articles: Article[]): Map<string, {
  article: Article
  same_subcat: CrosslinkEntry[]
  same_pillar: CrosslinkEntry[]
  cross_pillar: CrosslinkEntry[]
}> {
  const result = new Map<string, {
    article: Article
    same_subcat: CrosslinkEntry[]
    same_pillar: CrosslinkEntry[]
    cross_pillar: CrosslinkEntry[]
  }>()

  for (const article of articles) {
    const sameSubcat: CrosslinkEntry[] = []
    const samePillar: CrosslinkEntry[] = []
    const crossPillar: CrosslinkEntry[] = []

    for (const other of articles) {
      if (other.link_rewrite === article.link_rewrite) continue

      let common = 0
      for (const w of article.title_words) {
        if (other.title_words.has(w)) common++
      }

      const entry: CrosslinkEntry = {
        link_rewrite: other.link_rewrite,
        title: other.title,
        url: other.url,
        relevance: common,
      }

      if (
        other.pilier === article.pilier &&
        other.sous_cat === article.sous_cat &&
        article.sous_cat !== ''
      ) {
        sameSubcat.push(entry)
      } else if (other.pilier === article.pilier) {
        samePillar.push(entry)
      } else {
        crossPillar.push(entry)
      }
    }

    sameSubcat.sort((a, b) => b.relevance - a.relevance)
    samePillar.sort((a, b) => b.relevance - a.relevance)
    crossPillar.sort((a, b) => b.relevance - a.relevance)

    result.set(article.link_rewrite, {
      article,
      same_subcat:  sameSubcat.slice(0, MAX_SAME_SUBCAT),
      same_pillar:  samePillar.slice(0, MAX_SAME_PILLAR),
      cross_pillar: crossPillar.slice(0, MAX_CROSS_PILLAR),
    })
  }

  return result
}

async function persistCrosslinks(
  linkmap: ReturnType<typeof buildCrosslinks>,
  log: AutomateLog,
): Promise<{ inserted: number; total_links: number }> {
  const sql = getPgClient()

  let inserted = 0
  let totalLinks = 0

  await sql.begin(async (tx) => {
    await tx`DELETE FROM ${tx(PG_SCHEMA)}.cs_crosslinks`

    for (const { article, same_subcat, same_pillar, cross_pillar } of linkmap.values()) {
      const linkCount = same_subcat.length + same_pillar.length + cross_pillar.length
      totalLinks += linkCount

      await tx`
        INSERT INTO ${tx(PG_SCHEMA)}.cs_crosslinks
          (link_rewrite, title, url, pilier, sous_cat,
           same_subcat, same_pillar, cross_pillar, date_add, date_upd)
        VALUES (
          ${article.link_rewrite},
          ${article.title.slice(0, 500)},
          ${article.url.slice(0, 500)},
          ${article.pilier.slice(0, 64)},
          ${article.sous_cat.slice(0, 64)},
          ${JSON.stringify(same_subcat)},
          ${JSON.stringify(same_pillar)},
          ${JSON.stringify(cross_pillar)},
          NOW(),
          NOW()
        )
      `
      inserted++
    }
  })

  log.count('crosslinks_inserted', inserted)
  log.count('total_internal_links', totalLinks)
  return { inserted, total_links: totalLinks }
}

export default defineTask({
  meta: {
    name: 'seo:crosslinks-rebuild',
    description: 'Rebuild cs_crosslinks (cocon sémantique blog) — Wave 4D port ac_linkmap',
  },
  async run() {
    const skip = skipIfNotAcInternal('seo:crosslinks-rebuild')
    if (skip) return skip
    if (!(await pgSchemaExists(PG_SCHEMA))) {
      return { result: { status: 'skipped', reason: `schema-absent:${PG_SCHEMA}` } }
    }

    const lockResult = await withAutomateLock('ac_linkmap', async () => {
      return runAutomate('ac_linkmap', async (log) => {
        const t0 = Date.now()
        const articles = await fetchArticles(log)
        log.step('fetch', 'ok', `${articles.length} articles avec pattern --`, Date.now() - t0)

        if (articles.length === 0) {
          log.setResult('partial', 'aucun article éligible')
          return { status: 'partial', articles: 0 }
        }

        const t1 = Date.now()
        const linkmap = buildCrosslinks(articles)
        log.step('build', 'ok', `${linkmap.size} entrées calculées`, Date.now() - t1)

        const t2 = Date.now()
        const { inserted, total_links } = await persistCrosslinks(linkmap, log)
        log.step('persist', 'ok',
          `${inserted} rows insérées, ${total_links} liens internes`,
          Date.now() - t2)

        log.setResult('ok',
          `${inserted} crosslinks rebuild — ${total_links} liens (top 3/2/1 cocon)`)
        return { status: 'ok', articles: articles.length, inserted, total_links }
      })
    })

    if (!lockResult.acquired) {
      return { result: { status: 'skipped', reason: 'lock-held-by-other-instance' } }
    }
    return { result: lockResult.result }
  },
})
