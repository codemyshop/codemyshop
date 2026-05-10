/**
 *
 * Drizzle PG schema — product embedding domain (search-boost L1).
 *
 * `cs_product_embedding` — a semantic vector (mistral-embed 1024d) per
 * (id_product, id_lang). Fed by `synedre/ac_embedder.py` from
 * de name + reference + categories + description_short + description.
 *
 * `content_hash` (md5 of normalized text) allows the embedder to skip
 * the Mistral call if the product hasn't changed since the last run.
 *
 * `model` identifies the embedder used: a model change forces
 * re-indexing on the next run (mismatch detected on embedder side).
 *
 * HNSW cosine index for top-k search in O(log N).
 */

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
