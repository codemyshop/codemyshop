/**
 *
 * Nitro Task — audit:schema-watch
 *
 * Pilot Wave 1 of task #43. Port of
 * `ac_audit_schema.py` (cron 04:15 UTC) which scans
 * `information_schema` of schema `cs_main` and flags the
 * NAMING violations (CLAUDE.md rules 1-13). Each new violation
 * → INSERT cs_backlog (type='debt_archi', priority='P0').
 *
 * Port status:
 *   - ✅ A — Pluriels (r2)
 *   - ✅ B — Suffixes i18n interdits (r6)
 * - ✅ C — i18n columns in parent without `_lang` (r9)
 * - ✅ D — Missing composite PK on `_lang` (r7)
 * - ✅ E — Business JSON columns (r11)
 *   - ✅ F — Doublons fonctionnels ≥80% colonnes (r12)
 */

import { defineTask } from 'nitropack/runtime'
import { withAutomateLock } from '~/server/utils/automate-lock'
import { runAutomate, type AutomateLog } from '~/server/utils/automate-logger'
import { getPgClient } from '~/server/utils/db-pg-adapter'
import { skipIfNotAcInternal } from '~/server/utils/cron-context'

const PG_SCHEMA   = 'cs_main'
const AUDIT_PREFIX = '[ac_audit_schema]'

// ── Allowlists (parité 1:1 avec ac_audit_schema.py) ────────────────────────

const PLURAL_ALLOWLIST = new Set<string>([
  'cs_cicatrices', 'cs_incidents', 'cs_decisions', 'cs_events',
  'cs_event_registrations', 'cs_reviews', 'cs_reunions',
  'cs_blog_comments', 'cs_bot_hits', 'cs_bank_accounts',
  'cs_bank_transactions', 'cs_corbie_accounts', 'cs_corbie_messages',
  'cs_corbie_signals', 'cs_veille_signals', 'cs_veille_digests',
  'cs_audit_reports', 'cs_academy_progress', 'cs_automates',
  'cs_automate_logs', 'cs_automate_agents', 'cs_automate_conduites',
  'cs_agents', 'cs_agent_relations', 'cs_cron_errors',
  'cs_crosslinks', 'cs_monitoring_issues', 'cs_founder_reviews',
  'cs_referrals', 'cs_seourls', 'cs_tools', 'cs_workflows',
  'cs_inbox_emails', 'cs_agent_xp_history', 'cs_client_vps',
  'cs_customer_price_group', 'cs_category_cms',
])

const I18N_FORBIDDEN_SUFFIXES = [
  '_language', '_translation', '_i18n', '_trans', '_intl',
] as const

const I18N_PARENT_COLUMNS = new Set<string>([
  'title', 'description', 'meta_title', 'meta_description',
  'link_rewrite', 'alt', 'question', 'answer', 'intro_html',
  'content_html', 'subtitle', 'legend', 'caption',
])

const I18N_PARENT_ALLOWLIST = new Set<string>([
  'cs_audit_reports', 'cs_backlog', 'cs_chantier',
  'cs_chantier_travail', 'cs_cicatrices', 'cs_decisions',
  'cs_incidents', 'cs_cron_errors', 'cs_automate_logs',
  'cs_daily_meet', 'cs_drill_response', 'cs_academy_qa',
  'cs_bot_hits', 'cs_reunions', 'cs_founder_reviews',
  'cs_veille_digests', 'cs_veille_signals', 'cs_corbie_messages',
  'cs_blog_comments', 'cs_reviews', 'cs_agent_activity',
  'cs_ai_telemetry', 'cs_aiqueue', 'cs_events',
  'cs_event_registrations', 'cs_drill', 'cs_drill_scenario',
  'cs_drill_waitlist', 'cs_client_feedback', 'cs_content_queue',
  'cs_covergen_queue', 'cs_carousel_queue',
  'cs_category_covergen_queue', 'cs_category_queue',
  'cs_autoblog_queue', 'cs_autosocialpost_queue',
  'cs_conduite', 'cs_constitution', 'cs_doctrine',
  'cs_agents', 'cs_workflows', 'cs_expertise',
  'cs_ab_experiment', 'cs_dispatch_matrix',
  'cs_monitoring_issues', 'cs_brand_dna', 'cs_dictionary',
  'cs_depgraph',
  // Mono-lang par nature (facture FR langue client, pas traduisible) :
  'cs_invoice', 'cs_invoice_line', 'cs_quote', 'cs_quote_line',
  'cs_subscription',
  // Techniques internes (description = commentaire admin, pas user-facing) :
  'cs_automates', 'cs_bank_transactions', 'cs_calendar_weekly',
  'cs_feedback', 'cs_smartautomation_rule', 'cs_smarttask_template',
  // Queues IA (staging area pour jobs de rédaction, pas user-facing runtime) :
  'cs_cms_queue', 'cs_product_queue',
])

const JSON_BUSINESS_SUFFIXES = [
  'payload_json', 'items_json', 'blocks_json', 'content_i18n',
  'labels_json', 'slides_json', 'steps_json',
] as const

// (table, column) tolérés (techniques éphémères).
const JSON_COLUMN_ALLOWLIST = new Set<string>([
  'cs_automate_logs|steps',
  'cs_automate_logs|counters',
  'cs_automate_logs|errors',
  'cs_automate_logs|warnings',
  'cs_automate_logs|context',
  'cs_cron_errors|context',
  'cs_chantier_travail|context_json',
  'cs_chantier_travail|decisions_json',
  'cs_chantier_travail|discoveries_json',
  'cs_chantier_travail|zone_perimeter',
  'cs_chantier_travail|contract_dto',
  'cs_conduite|cues_json',
  'cs_conduite_representation|payload_json',
  'cs_ai_telemetry|payload_json',
  'cs_agent_heartbeat|payload_json',
  'cs_agent_activity|payload_json',
  'cs_incidents|payload_json',
  'cs_bot_hits|payload_json',
  'cs_drill_response|answers_json',
  'cs_decisions|payload_json',
  'cs_backlog|agent_prompt',
  'cs_carousel_queue|slides_json',
])

// Paires triées alphabétiquement (t1, t2) tolérées (≥80% communes).
const FUNCTIONAL_DUPLICATE_ALLOWLIST = new Set<string>([
  'cs_homepage_section_lang|cs_prefooter_section_lang',
  'cs_category_queue|cs_product_queue',
  'cs_moduleslist|cs_tools',
])

// ── Types ──────────────────────────────────────────────────────────────────

interface Violation {
  rule: string
  table: string
  detail: string
  fix: string
}

interface SchemaSnapshot {
  tables: string[]
  columnsByTable: Map<string, string[]>
  pkByTable: Map<string, string[]>
}

// ── Helpers info_schema (un seul aller-retour pour tout cacher) ────────────

// Le scheduler vit dans le layer `core/` — TOUS les tenants Nuxt (AC root +
// example-shop + smokevape + …) l'héritent. Or seul AC root pointe sur la DB
// `ac_hub` qui contient le schema `cs_main`. Sur un container tenant
// (example_v2_postgres / smoke_v2 / …) le schema n'existe pas → on skip.
async function pgSchemaExists(schema: string): Promise<boolean> {
  const sql = getPgClient()
  const rows = await sql<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.schemata WHERE schema_name = ${schema}
    ) AS exists
  `
  return Boolean(rows[0]?.exists)
}

async function fetchSchemaSnapshot(): Promise<SchemaSnapshot> {
  const sql = getPgClient()

  const tableRows = await sql<{ table_name: string }[]>`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = ${PG_SCHEMA} AND table_name LIKE 'cs_%'
    ORDER BY table_name
  `
  const tables = tableRows.map((r) => r.table_name)

  const colRows = await sql<{ table_name: string; column_name: string }[]>`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = ${PG_SCHEMA} AND table_name LIKE 'cs_%'
    ORDER BY table_name, ordinal_position
  `
  const columnsByTable = new Map<string, string[]>()
  for (const r of colRows) {
    let bucket = columnsByTable.get(r.table_name)
    if (!bucket) { bucket = []; columnsByTable.set(r.table_name, bucket) }
    bucket.push(r.column_name)
  }

  const pkRows = await sql<{ table_name: string; column_name: string }[]>`
    SELECT tc.table_name, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON kcu.constraint_name = tc.constraint_name
     AND kcu.table_schema    = tc.table_schema
     AND kcu.table_name      = tc.table_name
    WHERE tc.table_schema = ${PG_SCHEMA}
      AND tc.table_name LIKE 'cs_%'
      AND tc.constraint_type = 'PRIMARY KEY'
    ORDER BY tc.table_name, kcu.ordinal_position
  `
  const pkByTable = new Map<string, string[]>()
  for (const r of pkRows) {
    let bucket = pkByTable.get(r.table_name)
    if (!bucket) { bucket = []; pkByTable.set(r.table_name, bucket) }
    bucket.push(r.column_name)
  }

  return { tables, columnsByTable, pkByTable }
}

// ── Détecteur A — Pluriels (r2) ────────────────────────────────────────────

function detectPlurals(snap: SchemaSnapshot): Violation[] {
  const out: Violation[] = []
  const tableSet = new Set(snap.tables)
  for (const t of snap.tables) {
    if (t.endsWith('_lang')) continue
    if (PLURAL_ALLOWLIST.has(t)) continue
    if (!t.endsWith('s')) continue
    if (t.endsWith('ss') || t.endsWith('us') || t.endsWith('is') || t.endsWith('os')) continue
    const singular = t.slice(0, -1)
    const hasSingular = tableSet.has(singular)
    out.push({
      rule: '§NAMING r2',
      table: t,
      detail: `Nom au pluriel. Singulier attendu : \`${singular}\`.${hasSingular ? ' Singulier existe déjà → DOUBLON.' : ''}`,
      fix: `Renommer \`${t}\` → \`${singular}\` (module correspondant + migration data).`,
    })
  }
  return out
}

// ── Détecteur B — Suffixes i18n interdits (r6) ─────────────────────────────

function detectForbiddenI18nSuffix(snap: SchemaSnapshot): Violation[] {
  const out: Violation[] = []
  for (const t of snap.tables) {
    for (const bad of I18N_FORBIDDEN_SUFFIXES) {
      if (t.endsWith(bad)) {
        out.push({
          rule: '§NAMING r6',
          table: t,
          detail: `Suffixe i18n interdit \`${bad}\`. Seul \`_lang\` est canonique.`,
          fix: `Renommer → \`${t.slice(0, -bad.length)}_lang\` (+ migration PS).`,
        })
        break
      }
    }
  }
  return out
}

// ── Détecteur C — Cols i18n dans parent (r9) ───────────────────────────────

function detectI18nColsInParent(snap: SchemaSnapshot): Violation[] {
  const out: Violation[] = []
  const tableSet = new Set(snap.tables)
  for (const t of snap.tables) {
    if (t.endsWith('_lang')) continue
    if (I18N_PARENT_ALLOWLIST.has(t)) continue
    const cols = snap.columnsByTable.get(t) ?? []
    const offenders = cols.filter((c) => I18N_PARENT_COLUMNS.has(c)).sort()
    if (!offenders.length) continue
    const offendersStr = `[${offenders.map((o) => `'${o}'`).join(', ')}]`
    const hasLangPair = tableSet.has(`${t}_lang`)
    if (hasLangPair) {
      out.push({
        rule: '§NAMING r9 (duplication)',
        table: t,
        detail: `Colonnes i18n ${offendersStr} présentes dans parent ALORS QUE \`${t}_lang\` existe. Duplication à éliminer.`,
        fix: `Migrer les colonnes ${offendersStr} de \`${t}\` vers \`${t}_lang\` uniquement, puis DROP sur la parent.`,
      })
    } else {
      const entity = t.replace(/^cs_/, '')
      out.push({
        rule: '§NAMING r9',
        table: t,
        detail: `Colonnes i18n ${offendersStr} dans parent sans table \`${t}_lang\` jumelée.`,
        fix: `Créer \`${t}_lang\` (id_${entity}, id_lang, ${offenders.join(', ')}), migrer data, DROP cols parent.`,
      })
    }
  }
  return out
}

// ── Détecteur D — PK composite sur `_lang` (r7) ────────────────────────────

function detectLangPkComposite(snap: SchemaSnapshot): Violation[] {
  const out: Violation[] = []
  for (const t of snap.tables) {
    if (!t.endsWith('_lang')) continue
    const pk = snap.pkByTable.get(t) ?? []
    if (pk.length < 2) {
      const entity = t.replace(/^cs_/, '').replace(/_lang$/, '')
      out.push({
        rule: '§NAMING r7',
        table: t,
        detail: `Table \`_lang\` sans PK composite. PK actuelle : ${pk.length ? `[${pk.join(', ')}]` : '(aucune)'}.`,
        fix: `ALTER TABLE \`${t}\` DROP PRIMARY KEY, ADD PRIMARY KEY (id_${entity}, id_lang). Retirer tout auto_increment.`,
      })
      continue
    }
    if (!pk.includes('id_lang')) {
      out.push({
        rule: '§NAMING r7',
        table: t,
        detail: `PK composite sans \`id_lang\` : [${pk.join(', ')}].`,
        fix: `Ajouter \`id_lang\` dans la PK composite de \`${t}\`.`,
      })
    }
  }
  return out
}

// ── Détecteur E — Colonnes JSON métier (r11) ───────────────────────────────

function detectJsonBusinessCols(snap: SchemaSnapshot): Violation[] {
  const out: Violation[] = []
  for (const [t, cols] of snap.columnsByTable) {
    for (const c of cols) {
      if (JSON_COLUMN_ALLOWLIST.has(`${t}|${c}`)) continue
      const matches = JSON_BUSINESS_SUFFIXES.some((sfx) => c === sfx || c.endsWith(sfx))
      if (!matches) continue
      const childName = c.replace(/_json$/, '')
      out.push({
        rule: '§NAMING r11',
        table: t,
        detail: `Colonne JSON métier suspecte : \`${t}.${c}\`. Contenu (items, blocks, labels, payload…) doit vivre dans une table fille normalisée.`,
        fix: `Créer \`${t}_${childName}\` (table fille N-N ou N-1) et migrer le JSON en rows. Ou whitelister explicitement si techniquement éphémère (JSON_COLUMN_ALLOWLIST).`,
      })
    }
  }
  return out
}

// ── Détecteur F — Doublons fonctionnels (r12) ──────────────────────────────

function detectFunctionalDuplicates(snap: SchemaSnapshot): Violation[] {
  const out: Violation[] = []
  const tables = snap.tables
  const colsAsSet = new Map<string, Set<string>>()
  for (const t of tables) {
    colsAsSet.set(t, new Set(snap.columnsByTable.get(t) ?? []))
  }
  const seen = new Set<string>()
  for (let i = 0; i < tables.length; i++) {
    const t1 = tables[i]
    const c1 = colsAsSet.get(t1)!
    if (c1.size < 4) continue
    for (let j = i + 1; j < tables.length; j++) {
      const t2 = tables[j]
      if (t2.startsWith(`${t1}_`) || t1.startsWith(`${t2}_`)) continue
      const c2 = colsAsSet.get(t2)!
      if (c2.size < 4) continue
      let common = 0
      for (const c of c1) if (c2.has(c)) common++
      if (!common) continue
      const ratio = common / Math.max(c1.size, c2.size)
      if (ratio < 0.80) continue
      const [a, b] = t1 < t2 ? [t1, t2] : [t2, t1]
      const pairKey = `${a}|${b}`
      if (seen.has(pairKey)) continue
      seen.add(pairKey)
      if (FUNCTIONAL_DUPLICATE_ALLOWLIST.has(pairKey)) continue
      const pct = Math.round(ratio * 100)
      out.push({
        rule: '§NAMING r12',
        table: a,
        detail: `Doublon fonctionnel probable : \`${a}\` vs \`${b}\` (${common}/${Math.max(c1.size, c2.size)} colonnes communes, ratio=${pct}%).`,
        fix: `Unifier en une seule table (polymorphique parent_type/parent_id si deux domaines).`,
      })
    }
  }
  return out
}

// ── INSERT backlog (dédupliqué via title prefixé) ──────────────────────────

function buildTitle(v: Violation): string {
  const shortDetail = v.detail.split('.')[0].slice(0, 140)
  return `${AUDIT_PREFIX} ${v.rule} · ${v.table} — ${shortDetail}`.slice(0, 255)
}

function buildDescription(v: Violation): string {
  return [
    `**Règle violée** : ${v.rule}`,
    `**Table** : \`${v.table}\``,
    '',
    `**Constat** : ${v.detail}`,
    '',
    `**Correction suggérée** : ${v.fix}`,
    '',
    `_Détecté par Nitro Task \`audit:schema-watch\` (cron 04:30 UTC, shadow Wave 1)._`,
  ].join('\n')
}

async function existingAuditTitles(): Promise<Set<string>> {
  const sql = getPgClient()
  const rows = await sql<{ title: string }[]>`
    SELECT title FROM ${sql(PG_SCHEMA)}.cs_backlog
    WHERE title LIKE ${`${AUDIT_PREFIX}%`}
  `
  return new Set(rows.map((r) => r.title))
}

async function insertViolations(
  violations: Violation[],
  existing: Set<string>,
  log: AutomateLog,
): Promise<{ inserted: number; deduped: number }> {
  const sql = getPgClient()
  let inserted = 0
  let deduped  = 0
  for (const v of violations) {
    const title = buildTitle(v)
    if (existing.has(title)) { deduped++; continue }
    try {
      await sql`
        INSERT INTO ${sql(PG_SCHEMA)}.cs_backlog
          (title, description, type, category, priority, status,
           assigned_to, impact, effort_estimate, notes, date_add, date_upd)
        VALUES
          (${title}, ${buildDescription(v)}, 'debt_archi', 'infra', 'P0', 'backlog',
           'atlas', 'degradation', 'M',
           ${`Source: ac_audit_schema ${v.rule}`}, NOW(), NOW())
      `
      inserted++
      log.count('backlog_inserts')
    } catch (err) {
      log.step('backlog_insert_error', 'error',
        `${title.slice(0, 60)} — ${err instanceof Error ? err.message : String(err)}`)
    }
  }
  return { inserted, deduped }
}

// ── Nitro Task entrypoint ──────────────────────────────────────────────────

export default defineTask({
  meta: {
    name: 'audit:schema-watch',
    description: 'Audit quotidien §NAMING (port complet ac_audit_schema, Wave 1)',
  },
  async run() {
    const skip = skipIfNotAcInternal('audit:schema-watch')
    if (skip) return { result: skip }
    // Skip silencieux sur tenants distants (example-shop/smokevape) dont la DB
    // n'expose pas le schema audité. Évite la spam d'erreurs SQL en cron.
    if (!(await pgSchemaExists(PG_SCHEMA))) {
      return { result: { status: 'skipped', reason: `schema-absent:${PG_SCHEMA}` } }
    }

    const lockResult = await withAutomateLock('ac_audit_schema', async () => {
      return runAutomate('ac_audit_schema', async (log) => {
        const t0 = Date.now()
        const snap = await fetchSchemaSnapshot()
        log.step('fetch_schema', 'ok',
          `${snap.tables.length} tables / ` +
          `${[...snap.columnsByTable.values()].reduce((s, c) => s + c.length, 0)} colonnes / ` +
          `${snap.pkByTable.size} PKs`,
          Date.now() - t0)
        log.count('tables_scanned', snap.tables.length)

        const detectors: Array<[string, (s: SchemaSnapshot) => Violation[]]> = [
          ['plural_names',          detectPlurals],
          ['forbidden_i18n_suffix', detectForbiddenI18nSuffix],
          ['i18n_cols_in_parent',   detectI18nColsInParent],
          ['lang_pk_composite',     detectLangPkComposite],
          ['json_business_cols',    detectJsonBusinessCols],
          ['functional_duplicates', detectFunctionalDuplicates],
        ]

        const allViolations: Violation[] = []
        for (const [name, fn] of detectors) {
          const ts = Date.now()
          const found = fn(snap)
          log.step(name, 'ok', `${found.length} violation(s)`, Date.now() - ts)
          log.count(`v_${name}`, found.length)
          allViolations.push(...found)
        }
        log.count('violations_total', allViolations.length)

        if (!allViolations.length) {
          log.step('no_violations', 'ok', 'Schéma conforme §NAMING')
          log.setResult('ok', '0 violation')
          return { status: 'ok', violations: 0, inserted: 0, deduped: 0 }
        }

        const existing = await existingAuditTitles()
        log.count('backlog_existing', existing.size)
        const { inserted, deduped } = await insertViolations(allViolations, existing, log)
        log.count('backlog_new', inserted)
        log.count('backlog_dedup', deduped)

        log.setResult(
          inserted || deduped ? 'ok' : 'partial',
          `${allViolations.length} violations / ${inserted} new / ${deduped} dup`,
        )
        return { status: 'ok', violations: allViolations.length, inserted, deduped }
      })
    })

    if (!lockResult.acquired) {
      return { result: { status: 'skipped', reason: 'lock-held-by-other-instance' } }
    }
    return { result: lockResult.result }
  },
})
