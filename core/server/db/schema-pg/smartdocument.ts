

import {
  integer,
  serial,
  smallint,
  timestamp,
  varchar,
  pgSchema,
} from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export const smartdocument = vaisseauMereAcSchema.table(
  'cs_smartdocument',
  {
    idAcDocument: serial('id_ac_document').primaryKey(),
    idOwner: integer('id_owner').notNull(),
    idAcSmartproject: integer('id_ac_smartproject'),
    idAcSmartlead: integer('id_ac_smartlead'),
    idCustomer: integer('id_customer'),
    documentTitle: varchar('document_title', { length: 255 }),
    documentType: varchar('document_type', { length: 64 }),
    filePath: varchar('file_path', { length: 512 }),
    fileName: varchar('file_name', { length: 255 }),
    mimeType: varchar('mime_type', { length: 128 }),
    isPrivate: smallint('is_private').notNull().default(0),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull(),
    dateUpd: timestamp('date_upd', { mode: 'date', precision: 0 }).notNull(),
  },
)
