/**
 *
 * Drizzle PG schema — cover tenant config domain.
 * Database-only port of TENANT_CONFIG hard-coded in the cover generation module
 * (initiative #43 Wave 3 #3 Phase A — preparation for Pillow → sharp migration).
 *
 * 1 row par tenant : config visuelle (couleurs, masque) + URL site.
 */

import {
  pgSchema,
  serial,
  smallint,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export const coverTenantConfig = vaisseauMereAcSchema.table(
  'cs_cover_tenant_config',
  {
    idCoverTenantConfig: serial('id_cover_tenant_config').primaryKey(),
    tenant:          varchar('tenant', { length: 64 }).notNull().unique(),
    siteUrl:         varchar('site_url', { length: 255 }).notNull().default(''),
    masqueFilename:  varchar('masque_filename', { length: 255 }),
    preColor:        varchar('pre_color', { length: 16 }).notNull().default('#FFC700'),
    mainColor:       varchar('main_color', { length: 16 }).notNull().default('#FFFFFF'),
    gradientR:       smallint('gradient_r').notNull().default(15),
    gradientG:       smallint('gradient_g').notNull().default(23),
    gradientB:       smallint('gradient_b').notNull().default(42),
    accentColor:     varchar('accent_color', { length: 16 }).notNull().default('#4F46E5'),
    subtitleColor:   varchar('subtitle_color', { length: 16 }).notNull().default('#CBD5E1'),
    ctaColor:        varchar('cta_color', { length: 16 }).notNull().default('#FFC700'),
    brand:           varchar('brand', { length: 64 }).notNull().default(''),
    active:          smallint('active').notNull().default(1),
    dateAdd:         timestamp('date_add', { mode: 'date', precision: 0 }).notNull().defaultNow(),
    dateUpd:         timestamp('date_upd', { mode: 'date', precision: 0 }).notNull().defaultNow(),
  },
)
