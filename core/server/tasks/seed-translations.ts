

i18n

import { defineTask } from 'nitropack/runtime'
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { resolve, basename } from 'node:path'
import { parse as parseYaml } from 'yaml'
import { getPgClient } from '~/server/utils/db-pg-adapter'

const PG_SCHEMA = 'cs_main'
const OSS_DOMAIN = 'oss'
const OSS_THEME = 'core'

interface SeedResult {
  source: 'oss' | string  
  locale: string
  inserted: number
  updated: number
  unchanged: number
  skipped?: string
}

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

async function seedYamlFile(filepath: string, domain: string, theme: string, source: SeedResult['source']): Promise<SeedResult> {
  const localeCode = basename(filepath, '.yaml')
  const result: SeedResult = { source, locale: localeCode, inserted: 0, updated: 0, unchanged: 0 }

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
      WHERE id_lang = ${idLang} AND key = ${key} AND domain = ${domain}
      LIMIT 1
    `
    if (existing.length === 0) {
      await sql`
        INSERT INTO cs_main.ps_translation (id_lang, key, translation, domain, theme)
        VALUES (${idLang}, ${key}, ${translation}, ${domain}, ${theme})
      `
      result.inserted++
    } else if (existing[0].translation !== translation) {
      await sql`
        UPDATE cs_main.ps_translation
        SET translation = ${translation}
        WHERE id_lang = ${idLang} AND key = ${key} AND domain = ${domain}
      `
      result.updated++
    } else {
      result.unchanged++
    }
  }
  return result
}

function discoverTenantOverrides(root: string): { tenant: string; file: string }[] {
  const clientsDir = resolve(root, 'clients')
  if (!existsSync(clientsDir)) return []
  const out: { tenant: string; file: string }[] = []
  for (const tenant of readdirSync(clientsDir)) {
    const i18nDir = resolve(clientsDir, tenant, 'i18n')
    let stat
    try { stat = statSync(i18nDir) } catch { continue }
    if (!stat.isDirectory()) continue
    for (const f of readdirSync(i18nDir)) {
      if (!f.endsWith('.yaml')) continue
      out.push({ tenant, file: resolve(i18nDir, f) })
    }
  }
  return out
}

export default defineTask({
  meta: {
    name: 'seed:translations',
    description: 'Seed cs_translation from core/i18n/locales + clients/*/i18n YAML packs',
  },
  async run() {
    const root = process.cwd()
    const results: SeedResult[] = []

    
    const localesDir = resolve(root, 'core/i18n/locales')
    let coreFiles: string[] = []
    try {
      coreFiles = readdirSync(localesDir)
        .filter((f) => f.endsWith('.yaml'))
        .map((f) => resolve(localesDir, f))
    } catch (err) {
      return { result: 'no-core-locales-dir', error: String(err), dir: localesDir }
    }
    for (const f of coreFiles) {
      try {
        results.push(await seedYamlFile(f, OSS_DOMAIN, OSS_THEME, 'oss'))
      } catch (err) {
        results.push({
          source: 'oss', locale: basename(f, '.yaml'),
          inserted: 0, updated: 0, unchanged: 0,
          skipped: `error: ${String(err).slice(0, 200)}`,
        })
      }
    }

    
    for (const { tenant, file } of discoverTenantOverrides(root)) {
      const domain = `tenant:${tenant}`
      const source = `tenant:${tenant}` as const
      try {
        results.push(await seedYamlFile(file, domain, tenant, source))
      } catch (err) {
        results.push({
          source, locale: basename(file, '.yaml'),
          inserted: 0, updated: 0, unchanged: 0,
          skipped: `error: ${String(err).slice(0, 200)}`,
        })
      }
    }

    const summary = {
      files_processed: results.length,
      oss_files: results.filter((r) => r.source === 'oss').length,
      tenant_files: results.filter((r) => r.source !== 'oss').length,
      total_inserted: results.reduce((a, r) => a + r.inserted, 0),
      total_updated: results.reduce((a, r) => a + r.updated, 0),
      total_unchanged: results.reduce((a, r) => a + r.unchanged, 0),
      skipped: results.filter((r) => r.skipped).length,
    }
    return { result: 'success', summary, details: results }
  },
})
