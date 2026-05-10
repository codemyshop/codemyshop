/**
 *
 * Drizzle PG schema for `cs_aiqueue` — project #44 port-drizzle-mariadb-pg.
 *
 * LLM request queue (track usage tokens/cost/latency per task_id).
 * Owned by the ac_aiqueue module. Lives in the `cs_main` schema.
 *
 * Mapping types MariaDB -> PG :
 *   - INT AUTO_INCREMENT      -> serial
 *   - DECIMAL(p,s)            -> numeric(p, s)
 *   - ENUM('pending'…'failed')-> varchar(10) + $type<AiQueueStatus>
 *   - DATETIME                -> timestamp(0) without time zone
 */

import { index, integer, numeric, pgSchema, serial, text, timestamp, uniqueIndex, varchar } from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export type AiQueueStatus = 'pending' | 'processing' | 'completed' | 'failed'

export const aiQueueVaisseau = vaisseauMereAcSchema.table(
  'cs_aiqueue',
  {
    idEntry: serial('id_entry').primaryKey(),
    taskId: varchar('task_id', { length: 64 }).notNull(),
    provider: varchar('provider', { length: 64 }).notNull().default('anthropic'),
    model: varchar('model', { length: 128 }).notNull(),
    tokensIn: integer('tokens_in').notNull().default(0),
    tokensOut: integer('tokens_out').notNull().default(0),
    cost: numeric('cost', { precision: 12, scale: 6 }).notNull().default('0'),
    status: varchar('status', { length: 10 }).$type<AiQueueStatus>().notNull().default('pending'),
    clientId: varchar('client_id', { length: 64 }).notNull().default(''),
    name: varchar('name', { length: 255 }).notNull().default(''),
    errorMessage: varchar('error_message', { length: 512 }),
    latencyMs: integer('latency_ms'),
    systemPrompt: text('system_prompt'),
    userPrompt: text('user_prompt'),
    response: text('response'),
    totalItems: integer('total_items').notNull().default(1),
    completedItems: integer('completed_items').notNull().default(0),
    estimatedCost: numeric('estimated_cost', { precision: 12, scale: 6 }).notNull().default('0'),
    startedAt: timestamp('started_at', { mode: 'date', precision: 0 }),
    completedAt: timestamp('completed_at', { mode: 'date', precision: 0 }),
    httpStatus: integer('http_status'),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull(),
    dateUpd: timestamp('date_upd', { mode: 'date', precision: 0 }).notNull(),
  },
  (t) => ({
    uTask: uniqueIndex('idx_task_id').on(t.taskId),
    kStatus: index('idx_status').on(t.status),
    kClient: index('idx_client_id').on(t.clientId),
    kProvider: index('idx_provider').on(t.provider),
    kDate: index('idx_date_add').on(t.dateAdd),
  }),
)

export type AiQueuePgRow = typeof aiQueueVaisseau.$inferSelect
export type AiQueuePgInsert = typeof aiQueueVaisseau.$inferInsert
