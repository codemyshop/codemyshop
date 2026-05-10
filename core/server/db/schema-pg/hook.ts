/**
 *
 * Drizzle PG schema — hook domain.
 * Generated 2026-05-01 (php-eviction-phase2) from live PG information_schema.
 */

import {
  integer,
  serial,
  smallint,
  timestamp,
  varchar,
  pgSchema,
} from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export const hook = vaisseauMereAcSchema.table(
  'cs_hook',
  {
    idHook: serial('id_hook').primaryKey(),
    hookName: varchar('hook_name', { length: 64 }).notNull(),
    targetType: varchar('target_type', { length: 32 }).notNull(),
    targetId: varchar('target_id', { length: 128 }).notNull(),
    slot: varchar('slot', { length: 32 }).notNull().default('main'),
    component: varchar('component', { length: 128 }).notNull(),
    moduleName: varchar('module_name', { length: 64 }).notNull(),
    position: integer('position').notNull().default(0),
    active: smallint('active').notNull().default(1),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull().defaultNow(),
    dateUpd: timestamp('date_upd', { mode: 'date', precision: 0 }).notNull().defaultNow(),
  },
)
