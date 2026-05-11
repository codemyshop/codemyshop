

import {
  index,
  integer,
  primaryKey,
  timestamp,
  varchar,
  vector,
  pgSchema,
} from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export const productEmbedding = vaisseauMereAcSchema.table(
  'cs_product_embedding',
  {
    idProduct: integer('id_product').notNull(),
    idLang: integer('id_lang').notNull(),
    contentHash: varchar('content_hash', { length: 64 }).notNull(),
    model: varchar('model', { length: 32 }).notNull(),
    embedding: vector('embedding', { dimensions: 1024 }).notNull(),
    dateUpd: timestamp('date_upd', { mode: 'date', precision: 0 }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.idProduct, t.idLang] }),
    kEmbeddingHnsw: index('idx_ps_ac_product_embedding_hnsw').on(t.embedding),
  }),
)
