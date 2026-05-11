

import {
  integer,
  serial,
  smallint,
  text,
  timestamp,
  varchar,
  pgSchema,
} from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export const smartautomationLog = vaisseauMereAcSchema.table(
  'cs_smartautomation_log',
  {
    idAcSmartautomationLog: serial('id_ac_smartautomation_log').primaryKey(),
    idAcSmartautomationRule: integer('id_ac_smartautomation_rule').notNull(),
    idAcSmartproject: integer('id_ac_smartproject'),
    dateExecution: timestamp('date_execution', { mode: 'date', precision: 0 }).notNull(),
  },
)

export const smartautomationRule = vaisseauMereAcSchema.table(
  'cs_smartautomation_rule',
  {
    idAcSmartautomationRule: serial('id_ac_smartautomation_rule').primaryKey(),
    idOwner: integer('id_owner').notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    triggerType: varchar('trigger_type', { length: 64 }).notNull(),
    conditions: text('conditions'),
    actionType: varchar('action_type', { length: 64 }).notNull(),
    actionPayload: text('action_payload'),
    active: smallint('active').notNull().default(1),
  },
)
