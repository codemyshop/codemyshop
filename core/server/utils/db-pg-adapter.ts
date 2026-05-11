

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

export function convertMysqlToPg(sql: string): string {
  let out = sql

  
  out = out.replace(/`([^`]+)`/g, '"$1"')

  
  
  const schemaQualifyRegex =
    /\b(FROM|JOIN|INTO|UPDATE|TABLE\s+IF\s+NOT\s+EXISTS|TABLE)\s+("?)(ps_[a-zA-Z0-9_]+)\2/gi
  out = out.replace(
    schemaQualifyRegex,
    (_m, kw, _q, tbl) => `${kw} ${PG_SCHEMA}.${tbl}`,
  )

  
  
  
  
  
  out = out.replace(
    /\bDATE_(SUB|ADD)\s*\(\s*([^,()]+(?:\([^)]*\))?[^,()]*)\s*,\s*INTERVAL\s+(\d+)\s+(DAY|MONTH|YEAR|HOUR|MINUTE|SECOND)S?\b\s*\)/gi,
    (_m, op: string, expr: string, n: string, unit: string) => {
      const sign = op.toUpperCase() === 'SUB' ? '-' : '+'
      return `(${expr.trim()} ${sign} INTERVAL '${n} ${unit.toLowerCase()}s')`
    },
  )
  
  out = out.replace(
    /\bINTERVAL\s+(\d+)\s+(DAY|MONTH|YEAR|HOUR|MINUTE|SECOND)S?\b/gi,
    (_m, n: string, unit: string) => `INTERVAL '${n} ${unit.toLowerCase()}s'`,
  )

  
  
  
  
  
  out = out.replace(
    /\bDATE_(SUB|ADD)\s*\(\s*([^,()]+(?:\([^)]*\))?[^,()]*)\s*,\s*INTERVAL\s+\?\s+(DAY|MONTH|YEAR|HOUR|MINUTE|SECOND)S?\b\s*\)/gi,
    (_m, op: string, expr: string, unit: string) => {
      const sign = op.toUpperCase() === 'SUB' ? '-' : '+'
      return `(${expr.trim()} ${sign} ? * INTERVAL '1 ${unit.toLowerCase()}')`
    },
  )
  
  out = out.replace(
    /\bINTERVAL\s+\?\s+(DAY|MONTH|YEAR|HOUR|MINUTE|SECOND)S?\b/gi,
    (_m, unit: string) => `? * INTERVAL '1 ${unit.toLowerCase()}'`,
  )

  
  
  
  
  const TS_DIFF_DIVISOR: Record<string, number> = { SECOND: 1, MINUTE: 60, HOUR: 3600, DAY: 86400 }
  out = out.replace(
    /\bTIMESTAMPDIFF\s*\(\s*(SECOND|MINUTE|HOUR|DAY)\s*,\s*([^,()]+(?:\([^)]*\))?[^,()]*)\s*,\s*([^,()]+(?:\([^)]*\))?[^,()]*)\s*\)/gi,
    (_m, unit: string, a: string, b: string) => {
      const div = TS_DIFF_DIVISOR[unit.toUpperCase()] ?? 3600
      return `FLOOR(EXTRACT(EPOCH FROM (${b.trim()} - ${a.trim()})) / ${div})`
    },
  )

  
  
  out = out.replace(/\bIFNULL\s*\(/gi, 'COALESCE(')

  
  
  
  
  if (/^\s*INSERT\s+IGNORE\b/i.test(out) && !/\bON\s+CONFLICT\b/i.test(out)) {
    out = out.replace(/^\s*INSERT\s+IGNORE\b/i, 'INSERT')
    
    if (/\bRETURNING\b/i.test(out)) {
      out = out.replace(/\bRETURNING\b/i, 'ON CONFLICT DO NOTHING RETURNING')
    } else {
      out = out.replace(/;?\s*$/, ' ON CONFLICT DO NOTHING')
    }
  }

  
  
  
  
  
  
  
  
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
      if (PG_NATIVE_TYPES.has(alias.toUpperCase())) return m  
      return /[A-Z]/.test(alias) ? `AS "${alias}"` : `AS ${alias}`
    },
  )

  
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
      
      
      
      const COMPOSITE_PK_TABLES = new Set([
        'ps_customer_group', 'ps_category_product', 'ps_attribute_group_shop',
        'ps_attribute_shop', 'ps_feature_shop', 'ps_warehouse_shop',
        'ps_supplier_shop', 'ps_cart_rule_shop', 'ps_product_shop',
        'ps_carrier_zone', 'ps_module_shop', 'ps_lang_shop', 'ps_country_shop',
        
        
        'cs_category_cross',
      ])
      
      
      
      const insertMatch = pgSql.match(/INSERT\s+INTO\s+(?:[a-zA-Z_][a-zA-Z0-9_]*\.)?(ps_[a-zA-Z0-9_]+)\b/i)
      const hasReturning  = /\bRETURNING\b/i.test(pgSql)
      
      
      
      
      
      
      const isIdempotent  = /\bON\s+CONFLICT\b/i.test(pgSql)
      let pk: string | null = null
      if (insertMatch && !hasReturning && !isIdempotent && !COMPOSITE_PK_TABLES.has(insertMatch[1])) {
        const table = insertMatch[1]
        
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
