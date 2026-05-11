

import {
  integer,
  serial,
  text,
  timestamp,
  varchar,
  pgSchema,
} from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export const translateJob = vaisseauMereAcSchema.table(
  'cs_translate_job',
  {
    idJob: serial('id_job').primaryKey(),
    scope: varchar('scope', { length: 64 }).notNull(),
    sourceLang: integer('source_lang').notNull(),
    targetLang: integer('target_lang').notNull(),
    rowIds: text('row_ids').notNull(),
    status: varchar('status', { length: 16 }).notNull().default('draft'),
    appliedCount: integer('applied_count').notNull().default(0),
    employeeEmail: varchar('employee_email', { length: 128 }),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull().defaultNow(),
    dateUpd: timestamp('date_upd', { mode: 'date', precision: 0 }).notNull().defaultNow(),
  },
)
