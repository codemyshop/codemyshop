

import {
  date,
  index,
  integer,
  numeric,
  pgSchema,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export const routingTourVaisseau = vaisseauMereAcSchema.table(
  'cs_routing_tour',
  {
    idTour: serial('id_tour').primaryKey(),
    label: varchar('label', { length: 128 }).notNull(),
    tourDate: date('tour_date', { mode: 'string' }).notNull(),
    idVehicle: integer('id_vehicle').notNull().default(0),
    idDriver: integer('id_driver').notNull().default(0),
    depotLat: numeric('depot_lat', { precision: 10, scale: 6 }).notNull().default('48.823500'),
    depotLng: numeric('depot_lng', { precision: 10, scale: 6 }).notNull().default('2.353600'),
    status: varchar('status', { length: 16 })
      .$type<'planned' | 'in_progress' | 'done' | 'cancelled'>()
      .notNull()
      .default('planned'),
    optimizedAt: timestamp('optimized_at', { mode: 'date' }),
    totalKm: numeric('total_km', { precision: 10, scale: 2 }).notNull().default('0'),
    dateAdd: timestamp('date_add', { mode: 'date' }).notNull().defaultNow(),
    dateUpd: timestamp('date_upd', { mode: 'date' }).notNull().defaultNow(),
  },
  (t) => ({
    kTourDate: index('idx_routing_tour_tour_date').on(t.tourDate),
    kStatus: index('idx_routing_tour_status').on(t.status),
  }),
)

export const routingTourStopVaisseau = vaisseauMereAcSchema.table(
  'cs_routing_tour_stop',
  {
    idStop: serial('id_stop').primaryKey(),
    idTour: integer('id_tour').notNull(),
    position: integer('position').notNull().default(0),
    idOrder: integer('id_order').notNull().default(0),
    idCustomer: integer('id_customer').notNull().default(0),
    customerLabel: varchar('customer_label', { length: 255 }).notNull().default(''),
    address: varchar('address', { length: 255 }).notNull().default(''),
    postcode: varchar('postcode', { length: 16 }).notNull().default(''),
    city: varchar('city', { length: 128 }).notNull().default(''),
    lat: numeric('lat', { precision: 10, scale: 6 }).notNull().default('0'),
    lng: numeric('lng', { precision: 10, scale: 6 }).notNull().default('0'),
    windowStart: varchar('window_start', { length: 8 }),
    windowEnd: varchar('window_end', { length: 8 }),
    weightKg: numeric('weight_kg', { precision: 10, scale: 2 }).notNull().default('0'),
    pallets: integer('pallets').notNull().default(0),
    status: varchar('status', { length: 16 })
      .$type<'pending' | 'delivered' | 'failed' | 'skipped'>()
      .notNull()
      .default('pending'),
    notes: text('notes'),
    dateAdd: timestamp('date_add', { mode: 'date' }).notNull().defaultNow(),
    dateUpd: timestamp('date_upd', { mode: 'date' }).notNull().defaultNow(),
  },
  (t) => ({
    kTourPosition: index('idx_routing_tour_stop_tour_position').on(t.idTour, t.position),
    kStatus: index('idx_routing_tour_stop_status').on(t.status),
  }),
)

export const availabilityVaisseau = vaisseauMereAcSchema.table(
  'cs_availability',
  {
    idAvailability: serial('id_availability').primaryKey(),
    maxClients: integer('max_clients').notNull().default(2),
    currentClients: integer('current_clients').notNull().default(0),
    month: varchar('month', { length: 7 }).notNull().default(''),
    dateAdd: timestamp('date_add', { mode: 'date' }).notNull(),
    dateUpd: timestamp('date_upd', { mode: 'date' }).notNull(),
  },
  (t) => ({
    uMonth: uniqueIndex('idx_availability_month').on(t.month),
  }),
)

export type RoutingTourPgRow = typeof routingTourVaisseau.$inferSelect
export type RoutingTourStopPgRow = typeof routingTourStopVaisseau.$inferSelect
export type AvailabilityPgRow = typeof availabilityVaisseau.$inferSelect
