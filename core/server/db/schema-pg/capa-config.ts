

import {
  integer,
  numeric,
  pgSchema,
  serial,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export const capaConfigVaisseau = vaisseauMereAcSchema.table(
  'cs_capa_config',
  {
    idCapaConfig: serial('id_capa_config').primaryKey(),
    idShop: integer('id_shop').notNull().default(1),
    label: varchar('label', { length: 64 }),
    ticketAnnuelEur: integer('ticket_annuel_eur').notNull().default(10000),
    caConfortableMin: numeric('ca_confortable_min', { precision: 15, scale: 2 })
      .notNull()
      .default('5000000'),
    caFaisableMin: numeric('ca_faisable_min', { precision: 15, scale: 2 })
      .notNull()
      .default('1000000'),
    lossRatioMax: numeric('loss_ratio_max', { precision: 4, scale: 3 })
      .notNull()
      .default('0.100'),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull(),
    dateUpd: timestamp('date_upd', { mode: 'date', precision: 0 }).notNull(),
  },
  (t) => ({
    uShop: uniqueIndex('uq_ps_ac_capa_config_shop').on(t.idShop),
  }),
)

export type CapaConfigRow = typeof capaConfigVaisseau.$inferSelect
export type CapaConfigInsert = typeof capaConfigVaisseau.$inferInsert
