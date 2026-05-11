

import {
  integer,
  serial,
  text,
  timestamp,
  varchar,
  pgSchema,
} from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export const quoteRequest = vaisseauMereAcSchema.table(
  'cs_quote_request',
  {
    idQuoteRequest: serial('id_quote_request').primaryKey(),
    idCustomer: integer('id_customer').notNull().default(0),
    firstname: varchar('firstname', { length: 128 }).notNull().default(''),
    lastname: varchar('lastname', { length: 128 }).notNull().default(''),
    email: varchar('email', { length: 255 }).notNull().default(''),
    phone: varchar('phone', { length: 32 }).notNull().default(''),
    company: varchar('company', { length: 255 }).notNull().default(''),
    siret: varchar('siret', { length: 32 }).notNull().default(''),
    activite: varchar('activite', { length: 128 }).notNull().default(''),
    message: text('message'),
    totalItems: integer('total_items').notNull().default(0),
    status: varchar('status', { length: 32 }).notNull().default('pending'),
    noteInterne: text('note_interne'),
    leadId: integer('lead_id'),
    projectId: integer('project_id'),
    
    legalName:    varchar('legal_name',    { length: 255 }).notNull().default(''),
    nafCode:      varchar('naf_code',      { length: 8 }).notNull().default(''),
    nafLabel:     varchar('naf_label',     { length: 255 }).notNull().default(''),
    postalCode:   varchar('postal_code',   { length: 20 }).notNull().default(''),
    cityInsee:    varchar('city_insee',    { length: 128 }).notNull().default(''),
    addressInsee: varchar('address_insee', { length: 255 }).notNull().default(''),
    staffSize:    varchar('staff_size',    { length: 128 }).notNull().default(''),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull().defaultNow(),
    dateUpd: timestamp('date_upd', { mode: 'date', precision: 0 }).notNull().defaultNow(),
  },
)

export const quoteRequestItem = vaisseauMereAcSchema.table(
  'cs_quote_request_item',
  {
    idQuoteRequestItem: serial('id_quote_request_item').primaryKey(),
    idQuoteRequest: integer('id_quote_request').notNull(),
    idProduct: integer('id_product').notNull().default(0),
    name: varchar('name', { length: 255 }).notNull().default(''),
    reference: varchar('reference', { length: 64 }),
    quantity: integer('quantity').notNull().default(1),
    position: integer('position').notNull().default(0),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull().defaultNow(),
  },
)
