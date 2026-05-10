/**
 *
 * Drizzle PG schema — uptime monitoring domain.
 * Live state of 3-minute HTTP monitoring for production client sites.
 * Port DB-Only de synedre/state/clients_uptime.json (chantier #43 Wave 1).
 */

import {
  integer,
  pgSchema,
  serial,
  smallint,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export const uptimeState = vaisseauMereAcSchema.table(
  'cs_uptime_state',
  {
    idUptimeState:    serial('id_uptime_state').primaryKey(),
    clientId:         varchar('client_id', { length: 64 }).notNull().unique(),
    domain:           varchar('domain', { length: 255 }).notNull().default(''),
    label:            varchar('label', { length: 255 }).notNull().default(''),
    critical:         smallint('critical').notNull().default(0),
    currentStatus:    varchar('current_status', { length: 16 }).notNull().default('unknown'),
    lastHttpCode:     integer('last_http_code'),
    lastCheck:        timestamp('last_check', { mode: 'date', precision: 0 }),
    consecutiveFails: integer('consecutive_fails').notNull().default(0),
    downSince:        timestamp('down_since', { mode: 'date', precision: 0 }),
    alerted:          smallint('alerted').notNull().default(0),
    dateAdd:          timestamp('date_add', { mode: 'date', precision: 0 }).notNull().defaultNow(),
    dateUpd:          timestamp('date_upd', { mode: 'date', precision: 0 }).notNull().defaultNow(),
  },
)
