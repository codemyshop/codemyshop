/**
 *
 * Drizzle PG schemas for ac_telemetry — task #44 port-drizzle-mariadb-pg.
 *
 * 2 tables (cs_main) :
 * - cs_telemetry : logs each LLM call (model, tokens, cost, latency)
 * - cs_bot_hits  : logs each SEO bot visit (Google, GPT, Claude…)
 *
 * Mapping types MariaDB -> PG :
 *   - INT AUTO_INCREMENT  -> serial
 * - SMALLINT            -> smallint (Phase C dump parity)
 *   - TINYINT(1)          -> smallint (success column, dump l'a en smallint)
 *   - DECIMAL(p,s)        -> numeric(p, s)
 *   - DATETIME            -> timestamp(0) without time zone
 */

import {
  index,
  integer,
  numeric,
  pgSchema,
  serial,
  smallint,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export const telemetryVaisseau = vaisseauMereAcSchema.table(
  'cs_telemetry',
  {
    idTelemetry: serial('id_telemetry').primaryKey(),
    taskId: varchar('task_id', { length: 128 }).notNull(),
    model: varchar('model', { length: 64 }).notNull(),
    clientId: varchar('client_id', { length: 64 }).notNull().default(''),
    inputTokens: integer('input_tokens').notNull().default(0),
    outputTokens: integer('output_tokens').notNull().default(0),
    cost: numeric('cost', { precision: 10, scale: 6 }).notNull().default('0'),
    latencyMs: integer('latency_ms').notNull().default(0),
    httpStatus: smallint('http_status').notNull().default(200),
    success: smallint('success').notNull().default(1),
    errorMessage: text('error_message'),
    savedAt: timestamp('saved_at', { mode: 'date', precision: 0 }).notNull(),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull(),
  },
  (t) => ({
    kTaskId: index('idx_task_id').on(t.taskId),
    kModel: index('idx_model').on(t.model),
    kClientId: index('idx_client_id').on(t.clientId),
    kSuccess: index('idx_success').on(t.success),
    kSavedAt: index('idx_saved_at').on(t.savedAt),
  }),
)

export const botHitVaisseau = vaisseauMereAcSchema.table(
  'cs_bot_hits',
  {
    idHit: serial('id_hit').primaryKey(),
    bot: varchar('bot', { length: 64 }).notNull(),
    url: varchar('url', { length: 500 }).notNull(),
    status: integer('status').notNull().default(200),
    ip: varchar('ip', { length: 45 }).notNull().default(''),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull(),
  },
  (t) => ({
    kBot: index('idx_bot').on(t.bot),
    kDate: index('idx_date').on(t.dateAdd),
  }),
)

export type TelemetryPgRow = typeof telemetryVaisseau.$inferSelect
export type TelemetryPgInsert = typeof telemetryVaisseau.$inferInsert
export type BotHitPgRow = typeof botHitVaisseau.$inferSelect
export type BotHitPgInsert = typeof botHitVaisseau.$inferInsert
