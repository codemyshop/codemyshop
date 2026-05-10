/**
 *
 * Nitro Task — seed:translations
 *
 * Reads every `core/i18n/locales/<locale>.yaml` and upserts the flattened
 * key/value pairs into `ps_translation` (PG, schema cs_main) with
 * `domain='oss'`. Idempotent: re-running on identical files is a no-op
 * because we use ON CONFLICT DO UPDATE only when the value differs.
 *
 * Triggered:
 *   - At install (one-shot, docker entrypoint or `pnpm seed:translations`)
 *   - After every deploy that touches `core/i18n/locales/*.yaml`
 *
 * Locale codes map to PrestaShop `id_lang` via `ps_lang.iso_code`. Locales
 * with no matching `ps_lang` row are skipped (with a warning) — install the
 * language pack first, then re-seed.
 */

import { defineTask } from 'nitropack/runtime'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve, basename } from 'node:path'
import { parse as parseYaml } from 'yaml'
import { getPgClient } from '~/server/utils/db-pg-adapter'

const PG_SCHEMA = 'cs_main'
const DOMAIN = 'oss'

interface SeedResult {
  locale: string
  inserted: number
  updated: number
  unchanged: number
  skipped?: string
}

/** Walk the YAML tree, emitting flat dotted keys + leaf string values. */
function flatten(node: unknown, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {}
  if (node === null || node === undefined) return out
  if (typeof node === 'string') {
    if (prefix) out[prefix] = node
    return out
  }
  if (typeof node !== 'object') return out
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    const next = prefix ? `${prefix}.${k}` : k
    Object.assign(out, flatten(v, next))
  }
  return out
}

async function resolveLangId(localeCode: string): Promise<number | null> {
  const sql = getPgClient()
  const rows = await sql<{ id_lang: number }[]>`
    SELECT id_lang FROM cs_main.ps_lang
    WHERE iso_code = ${localeCode} OR language_code = ${localeCode}
    LIMIT 1
  `
  return rows[0]?.id_lang ?? null
}

async function seedLocale(filepath: string): Promise<SeedResult> {
  const localeCode = basename(filepath, '.yaml')
  const result: SeedResult = { locale: localeCode, inserted: 0, updated: 0, unchanged: 0 }

  const idLang = await resolveLangId(localeCode)
  if (idLang === null) {
    result.skipped = `no ps_lang row for iso_code='${localeCode}' — install language pack first`
    return result
  }

  const tree = parseYaml(readFileSync(filepath, 'utf-8'))
  const flat = flatten(tree)
  if (Object.keys(flat).length === 0) {
    result.skipped = 'empty file'
    return result
  }

  const sql = getPgClient()
  for (const [key, translation] of Object.entries(flat)) {
    const existing = await sql<{ translation: string }[]>`
      SELECT translation FROM cs_main.ps_translation
      WHERE id_lang = ${idLang} AND key = ${key} AND domain = ${DOMAIN}
      LIMIT 1
    `
    if (existing.length === 0) {
      await sql`
        INSERT INTO cs_main.ps_translation (id_lang, key, translation, domain, theme)
        VALUES (${idLang}, ${key}, ${translation}, ${DOMAIN}, 'core')
      `
      result.inserted++
    } else if (existing[0].translation !== translation) {
      await sql`
        UPDATE cs_main.ps_translation
        SET translation = ${translation}
        WHERE id_lang = ${idLang} AND key = ${key} AND domain = ${DOMAIN}
      `
      result.updated++
    } else {
      result.unchanged++
    }
  }
  return result
}

export default defineTask({
  meta: {
    name: 'seed:translations',
    description: 'Seed cs_translation from core/i18n/locales/*.yaml',
  },
  async run() {
    const localesDir = resolve(process.cwd(), 'core/i18n/locales')
    let files: string[]
    try {
      files = readdirSync(localesDir)
        .filter((f) => f.endsWith('.yaml'))
        .map((f) => resolve(localesDir, f))
    } catch (err) {
      return { result: 'no-locales-dir', error: String(err) }
    }
    if (files.length === 0) {
      return { result: 'no-yaml-files-found', dir: localesDir }
    }

    const results: SeedResult[] = []
    for (const f of files) {
      try {
        results.push(await seedLocale(f))
      } catch (err) {
        results.push({
          locale: basename(f, '.yaml'),
          inserted: 0,
          updated: 0,
          unchanged: 0,
          skipped: `error: ${String(err).slice(0, 200)}`,
        })
      }
    }

    const summary = {
      files_processed: results.length,
      total_inserted: results.reduce((a, r) => a + r.inserted, 0),
      total_updated: results.reduce((a, r) => a + r.updated, 0),
      total_unchanged: results.reduce((a, r) => a + r.unchanged, 0),
      skipped: results.filter((r) => r.skipped).length,
    }
    return { result: 'success', summary, details: results }
  },
})
