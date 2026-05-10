/**
 *
 * Drizzle PG schema — brand DNA domain.
 * Generated 2026-05-01 (php-eviction-phase2) from live PG information_schema.
 */

import {
  serial,
  text,
  timestamp,
  varchar,
  pgSchema,
} from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export const brandDna = vaisseauMereAcSchema.table(
  'cs_brand_dna',
  {
    idBrandDna: serial('id_brand_dna').primaryKey(),
    clientId: varchar('client_id', { length: 64 }).notNull(),
    clientName: varchar('client_name', { length: 255 }).notNull().default(''),
    positioning: text('positioning'),
    identity: text('identity'),
    valuesJson: text('values_json'),
    toneOfVoice: text('tone_of_voice'),
    usp: text('usp'),
    mindset: text('mindset'),
    promise: text('promise'),
    forbiddenWords: text('forbidden_words'),
    mandatoryReferences: text('mandatory_references'),
    targetAudience: text('target_audience'),
    fullDna: text('full_dna'),
    designSystem: text('design_system'),
    source: varchar('source', { length: 12 }).notNull().default('manual'),
    sourceUrl: varchar('source_url', { length: 512 }),
    aiModel: varchar('ai_model', { length: 64 }),
    createdAt: timestamp('created_at', { mode: 'date', precision: 0 }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date', precision: 0 }).notNull().defaultNow(),
  },
)
