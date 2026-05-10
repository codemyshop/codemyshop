/**
 *
 * Adapt PG for ~184 legacy useClientDb endpoints (mysql2-based).
 * Chantier #38 Phase D2 batch 4 — cutover global utilisant PG_ENABLED_DOMAINS=*.
 *
 * A useClientDb-like interface (query/get/run) that dispatches to
 * postgres-js with automatic conversion:
 *   - placeholders `?` → `$1, $2, ...` (positional)
 * - unqualified `ps_xxx` tables → `cs_main.ps_xxx`
 *   - backticks `` `col` `` → guillemets `"col"`
 * - INSERT INTO without RETURNING → add `RETURNING <pk>` detected heuristically
 *   - `INSERT IGNORE INTO foo …` → `INSERT INTO foo … ON CONFLICT DO NOTHING`
 *
 * Does NOT handle automatically (caller must handle manually):
 *   - ON DUPLICATE KEY UPDATE → ON CONFLICT
 * - LAST_INSERT_ID() function call (rare, almost all use insertId result)
 *   - GROUP_CONCAT, FIND_IN_SET, DATE_FORMAT, DATE_SUB
 * - CURDATE() (but NOW() OK)
 *
 * When an endpoint needs these patterns, add a dedicated onPg() branch
 * (see modules ported in Phase D2 batch 1-3).
 */

import postgres from 'postgres'

let pgClient: ReturnType<typeof postgres> | null = null

export function getPgClient() {
  if (pgClient) return pgClient
  const password = process.env.PG_PASSWORD
  if (!password) throw new Error('PG_PASSWORD non défini — voir .env')
  pgClient = postgres({
    host: process.env.PG_HOST || 'ac_postgres',
    port: Number(process.env.PG_PORT || 5432),
    user: process.env.PG_USER || 'claude_pg',
    password,
    database: process.env.PG_DB || 'ac_hub',
    max: 20,
    idle_timeout: 300,
    connect_timeout: 15,
    onnotice: () => {},
  })
  return pgClient
}

const PG_SCHEMA = 'cs_main'

/**
 * Converts a MySQL query to a PG query:
 *   - `?` → $1, $2, ...
 *   - backticks → double-quotes
 * - `ps_xxx` → `cs_main.ps_xxx` (only after FROM/JOIN/INTO/UPDATE/...)
 */
export function convertMysqlToPg(sql: string): string {
  let out = sql

  // 1. Backticks → double-quotes
  out = out.replace(/`([^`]+)`/g, '"$1"')

  // 2. Schema-qualify les tables ps_xxx après les keywords de référence.
  //    Tolérant aux double-quotes `"ps_xxx"` (post-conversion backtick).
  const schemaQualifyRegex =
    /\b(FROM|JOIN|INTO|UPDATE|TABLE\s+IF\s+NOT\s+EXISTS|TABLE)\s+("?)(ps_[a-zA-Z0-9_]+)\2/gi
  out = out.replace(
    schemaQualifyRegex,
    (_m, kw, _q, tbl) => `${kw} ${PG_SCHEMA}.${tbl}`,
  )

  // 2b. DATE_SUB / DATE_ADD MariaDB → soustraction / addition PG.
  //   `DATE_SUB(NOW(), INTERVAL 90 DAY)` → `(NOW() - INTERVAL '90 days')`
  //   `DATE_ADD(x, INTERVAL 30 DAY)`     → `(x + INTERVAL '30 days')`
  // Couvre DAY/MONTH/YEAR/HOUR/MINUTE/SECOND (au singulier MariaDB côté in,
  // forme pluriel `days`/`months`/... attendue par PG côté out).
  out = out.replace(
    /\bDATE_(SUB|ADD)\s*\(\s*([^,()]+(?:\([^)]*\))?[^,()]*)\s*,\s*INTERVAL\s+(\d+)\s+(DAY|MONTH|YEAR|HOUR|MINUTE|SECOND)S?\b\s*\)/gi,
    (_m, op: string, expr: string, n: string, unit: string) => {
      const sign = op.toUpperCase() === 'SUB' ? '-' : '+'
      return `(${expr.trim()} ${sign} INTERVAL '${n} ${unit.toLowerCase()}s')`
    },
  )
  // 2c. Standalone `INTERVAL N DAY` (hors DATE_SUB/ADD déjà traités) → `INTERVAL 'N days'`.
  out = out.replace(
    /\bINTERVAL\s+(\d+)\s+(DAY|MONTH|YEAR|HOUR|MINUTE|SECOND)S?\b/gi,
    (_m, n: string, unit: string) => `INTERVAL '${n} ${unit.toLowerCase()}s'`,
  )

  // 2c-bis. `DATE_(SUB|ADD)(expr, INTERVAL ? UNIT)` (placeholder param) →
  //   `(expr ±  ? * INTERVAL '1 unit')`. PG accepte `<int> * INTERVAL '1 unit'`,
  //   ce qui permet de garder le placeholder pour le driver.
  // Couvre password-reset + BI/finance/invoices qui passaient le multiplicateur
  // en param (cassait silencieusement depuis le cutover PG du 30/04).
  out = out.replace(
    /\bDATE_(SUB|ADD)\s*\(\s*([^,()]+(?:\([^)]*\))?[^,()]*)\s*,\s*INTERVAL\s+\?\s+(DAY|MONTH|YEAR|HOUR|MINUTE|SECOND)S?\b\s*\)/gi,
    (_m, op: string, expr: string, unit: string) => {
      const sign = op.toUpperCase() === 'SUB' ? '-' : '+'
      return `(${expr.trim()} ${sign} ? * INTERVAL '1 ${unit.toLowerCase()}')`
    },
  )
  // 2c-ter. Standalone `INTERVAL ? DAY` → `? * INTERVAL '1 day'`.
  out = out.replace(
    /\bINTERVAL\s+\?\s+(DAY|MONTH|YEAR|HOUR|MINUTE|SECOND)S?\b/gi,
    (_m, unit: string) => `? * INTERVAL '1 ${unit.toLowerCase()}'`,
  )

  // 2d. `TIMESTAMPDIFF(unit, a, b)` (MariaDB) → `FLOOR(EXTRACT(EPOCH FROM (b - a)) / divisor)` (PG).
  //   MariaDB : signe = b - a (positif si b > a). Couvre SECOND/MINUTE/HOUR/DAY.
  //   WEEK/MONTH/YEAR ignorés ici (sémantique calendaire à porter au cas par cas).
  // Cause silencieuse de /hub/carts/abandoned vide depuis cutover PG (30/04).
  const TS_DIFF_DIVISOR: Record<string, number> = { SECOND: 1, MINUTE: 60, HOUR: 3600, DAY: 86400 }
  out = out.replace(
    /\bTIMESTAMPDIFF\s*\(\s*(SECOND|MINUTE|HOUR|DAY)\s*,\s*([^,()]+(?:\([^)]*\))?[^,()]*)\s*,\s*([^,()]+(?:\([^)]*\))?[^,()]*)\s*\)/gi,
    (_m, unit: string, a: string, b: string) => {
      const div = TS_DIFF_DIVISOR[unit.toUpperCase()] ?? 3600
      return `FLOOR(EXTRACT(EPOCH FROM (${b.trim()} - ${a.trim()})) / ${div})`
    },
  )

  // 2c-bis. IFNULL(a, b) (MySQL) → COALESCE(a, b) (PG). Sémantique identique
  // sur 2 args mais PG n'a pas IFNULL — il faut la fonction standard.
  out = out.replace(/\bIFNULL\s*\(/gi, 'COALESCE(')

  // 2c-ter. INSERT IGNORE INTO foo … (MySQL idempotence sur unique violation)
  // → INSERT INTO foo … ON CONFLICT DO NOTHING (PG, équivalent fonctionnel).
  // PG abandonne silencieusement la row sur conflit unique/PK sans target
  // explicite. Skip si la query contient déjà ON CONFLICT (caller manuel).
  if (/^\s*INSERT\s+IGNORE\b/i.test(out) && !/\bON\s+CONFLICT\b/i.test(out)) {
    out = out.replace(/^\s*INSERT\s+IGNORE\b/i, 'INSERT')
    // Insère ON CONFLICT DO NOTHING avant RETURNING s'il existe, sinon en fin.
    if (/\bRETURNING\b/i.test(out)) {
      out = out.replace(/\bRETURNING\b/i, 'ON CONFLICT DO NOTHING RETURNING')
    } else {
      out = out.replace(/;?\s*$/, ' ON CONFLICT DO NOTHING')
    }
  }

  // 2d. PG lowercase tous les identifiants non-quotés. Donc `AS priceRaw`
  //   produit la colonne `priceraw` côté résultat — le JS qui lit
  //   `row.priceRaw` reçoit `undefined`. Auto-quote tout alias contenant
  //   au moins un caractère uppercase pour préserver la casse côté output.
  //
  // Exception : PG types natifs (TEXT, VARCHAR, INTEGER, etc.) — sinon
  // `CAST(x AS TEXT)` devient `CAST(x AS "TEXT")` que PG lit comme un
  // type nommé entre guillemets ⇒ "type TEXT does not exist". Cicatrice
  const PG_NATIVE_TYPES = new Set([
    'TEXT', 'VARCHAR', 'CHAR', 'BPCHAR',
    'INTEGER', 'INT', 'INT2', 'INT4', 'INT8', 'BIGINT', 'SMALLINT',
    'NUMERIC', 'DECIMAL', 'REAL', 'FLOAT', 'FLOAT4', 'FLOAT8',
    'BOOLEAN', 'BOOL',
    'DATE', 'TIMESTAMP', 'TIMESTAMPTZ', 'TIME', 'TIMETZ', 'INTERVAL',
    'BYTEA', 'UUID', 'JSON', 'JSONB', 'XML',
    'MONEY', 'OID', 'NAME', 'CITEXT',
  ])
  out = out.replace(
    /\bAS\s+([A-Za-z_][A-Za-z0-9_]*)/g,
    (m, alias: string) => {
      if (PG_NATIVE_TYPES.has(alias.toUpperCase())) return m  // type cast — laisser tel quel
      return /[A-Z]/.test(alias) ? `AS "${alias}"` : `AS ${alias}`
    },
  )

  // 3. `?` → $N (en respectant les strings quotées)
  let counter = 0
  let result = ''
  let inSingle = false
  let inDouble = false
  for (let i = 0; i < out.length; i++) {
    const c = out[i]
    const prev = i > 0 ? out[i - 1] : ''
    if (c === "'" && prev !== '\\' && !inDouble) inSingle = !inSingle
    else if (c === '"' && prev !== '\\' && !inSingle) inDouble = !inDouble
    if (c === '?' && !inSingle && !inDouble) {
      counter++
      result += `$${counter}`
    } else {
      result += c
    }
  }
  return result
}

export interface PgAdapterClient {
  clientId: string
  query<T = any>(sql: string, params?: any[]): Promise<T[]>
  get<T = any>(sql: string, params?: any[]): Promise<T | null>
  run(sql: string, params?: any[]): Promise<{ affectedRows: number; insertId: number }>
}

export function buildPgAdapter(clientId: string): PgAdapterClient {
  const sql = getPgClient()
  return {
    clientId,
    async query<T = any>(rawSql: string, params: any[] = []): Promise<T[]> {
      const pgSql = convertMysqlToPg(rawSql)
      const rows = await sql.unsafe(pgSql, params as any)
      return rows as unknown as T[]
    },
    async get<T = any>(rawSql: string, params: any[] = []): Promise<T | null> {
      const pgSql = convertMysqlToPg(rawSql)
      const rows: any = await sql.unsafe(pgSql, params as any)
      return (rows as any[])[0] ?? null
    },
    async run(
      rawSql: string,
      params: any[] = [],
    ): Promise<{ affectedRows: number; insertId: number }> {
      let pgSql = convertMysqlToPg(rawSql)
      // Tables de jointure PS connues à PK composite (pas d'id_xxx unique).
      // L'heuristique RETURNING qui suit produirait `RETURNING id_customer_group`
      // ou `RETURNING id_category_product` qui n'existent pas en colonne — fail.
      const COMPOSITE_PK_TABLES = new Set([
        'ps_customer_group', 'ps_category_product', 'ps_attribute_group_shop',
        'ps_attribute_shop', 'ps_feature_shop', 'ps_warehouse_shop',
        'ps_supplier_shop', 'ps_cart_rule_shop', 'ps_product_shop',
        'ps_carrier_zone', 'ps_module_shop', 'ps_lang_shop', 'ps_country_shop',
        // cs_* à PK composite (l'heuristique strippe cs_ et fabrique
        // id_<entité>_<entité> qui n'existe pas) :
        'cs_category_cross',
      ])
      // Heuristique INSERT sans RETURNING → ajoute RETURNING <pk> pour insertId.
      // Skip si query a ON CONFLICT DO NOTHING (pattern idempotent où l'insertId
      // ne sert pas) ou table de jointure connue.
      const insertMatch = pgSql.match(/INSERT\s+INTO\s+(?:[a-zA-Z_][a-zA-Z0-9_]*\.)?(ps_[a-zA-Z0-9_]+)\b/i)
      const hasReturning  = /\bRETURNING\b/i.test(pgSql)
      // Skip RETURNING heuristic pour TOUT ON CONFLICT (DO NOTHING ou DO UPDATE).
      // Sur ON CONFLICT DO UPDATE, ajouter RETURNING id_<table_strip> casse les
      // tables à PK composite (ps_*_lang) — le strip produit `id_feature_lang`
      // alors que la PK est `(id_feature, id_lang)`. Un caller qui a vraiment
      // besoin de l'insertId écrit son RETURNING explicitement (cf. incidents
      // 2026-05-02 db.run/RETURNING + chantier #67 mariadb-eviction-phase5).
      const isIdempotent  = /\bON\s+CONFLICT\b/i.test(pgSql)
      let pk: string | null = null
      if (insertMatch && !hasReturning && !isIdempotent && !COMPOSITE_PK_TABLES.has(insertMatch[1])) {
        const table = insertMatch[1]
        // Convention PS : id_<table sans préfixe>. Pour cs_*, drop ac_ aussi.
        const stripped = table.replace(/^ps_(ac_)?/, '')
        pk = `id_${stripped}`
        pgSql += ` RETURNING ${pk}`
      }
      const result: any = await sql.unsafe(pgSql, params as any)
      const insertId = pk ? Number(result?.[0]?.[pk] ?? 0) : 0
      const affectedRows = (result as any).count ?? (result as any[]).length ?? 0
      return { affectedRows, insertId }
    },
  }
}
