/**
 *
 * cs_email_config facade (singleton): reads SMTP/Resend config from
 * the DB first, fallback to process.env.*. Cache TTL 60s.
 *
 * Usage :
 *   const cfg = await loadEmailConfig()        // lecture (DB > env)
 *   await saveEmailConfig({ smtp_host, ... })   // upsert
 * clearEmailConfigCache()                     // invalidates after save
 */

import { getPgClient } from './db-pg-adapter'

const PG_SCHEMA = 'cs_main'
const TTL_MS = 60_000

export interface EmailConfig {
  smtp_host:   string
  smtp_port:   number
  smtp_user:   string
  smtp_from:   string
  smtp_secure: boolean
  from_email:  string
  reply_to:    string
  /** D'où vient la valeur affichée : 'db' (row présente) ou 'env' (fallback). */
  source:      'db' | 'env'
}

let cache: { data: EmailConfig; ts: number } | null = null

function readEnv(): EmailConfig {
  const port = Number(process.env.SMTP_PORT || 465)
  return {
    smtp_host:   process.env.SMTP_HOST || '',
    smtp_port:   port,
    smtp_user:   process.env.SMTP_USER || process.env.IMAP_USER || '',
    smtp_from:   process.env.SMTP_FROM || process.env.SMTP_USER || '',
    smtp_secure: port === 465,
    from_email:  process.env.EMAIL_FROM || '',
    reply_to:    process.env.RESEND_DEFAULT_FROM || '',
    source:      'env',
  }
}

export async function loadEmailConfig(): Promise<EmailConfig> {
  const now = Date.now()
  if (cache && now - cache.ts < TTL_MS) return cache.data

  const env = readEnv()
  try {
    const sql = getPgClient()
    const rows = await sql<any[]>`
      SELECT smtp_host, smtp_port, smtp_user, smtp_from, smtp_secure,
             from_email, reply_to
      FROM ${sql(PG_SCHEMA)}.cs_email_config
      WHERE id_email_config = 1
      LIMIT 1
    `
    if (rows.length > 0) {
      const r = rows[0]
      const data: EmailConfig = {
        smtp_host:   String(r.smtp_host   || env.smtp_host),
        smtp_port:   Number(r.smtp_port   || env.smtp_port),
        smtp_user:   String(r.smtp_user   || env.smtp_user),
        smtp_from:   String(r.smtp_from   || env.smtp_from),
        smtp_secure: Number(r.smtp_secure) === 1,
        from_email:  String(r.from_email  || env.from_email),
        reply_to:    String(r.reply_to    || env.reply_to),
        source:      'db',
      }
      cache = { data, ts: now }
      return data
    }
  } catch (err: any) {
    console.warn('[email-config] DB read failed, fallback env:', err?.message)
  }

  cache = { data: env, ts: now }
  return env
}

export interface SaveEmailConfigInput {
  smtp_host?:   string
  smtp_port?:   number
  smtp_user?:   string
  smtp_from?:   string
  smtp_secure?: boolean
  from_email?:  string
  reply_to?:    string
}

export async function saveEmailConfig(input: SaveEmailConfigInput): Promise<void> {
  const sql = getPgClient()
  const port = input.smtp_port == null ? null : Number(input.smtp_port)
  const secure = input.smtp_secure == null ? 1 : (input.smtp_secure ? 1 : 0)

  await sql`
    INSERT INTO ${sql(PG_SCHEMA)}.cs_email_config
      (id_email_config, smtp_host, smtp_port, smtp_user, smtp_from,
       smtp_secure, from_email, reply_to, date_add, date_upd)
    VALUES
      (1, ${input.smtp_host ?? null}, ${port}, ${input.smtp_user ?? null},
       ${input.smtp_from ?? null}, ${secure}, ${input.from_email ?? null},
       ${input.reply_to ?? null}, NOW(), NOW())
    ON CONFLICT (id_email_config) DO UPDATE SET
      smtp_host   = EXCLUDED.smtp_host,
      smtp_port   = EXCLUDED.smtp_port,
      smtp_user   = EXCLUDED.smtp_user,
      smtp_from   = EXCLUDED.smtp_from,
      smtp_secure = EXCLUDED.smtp_secure,
      from_email  = EXCLUDED.from_email,
      reply_to    = EXCLUDED.reply_to,
      date_upd    = NOW()
  `
  clearEmailConfigCache()
}

export function clearEmailConfigCache(): void {
  cache = null
}
