/**
 *
 * Drizzle PG schema — theme domain.
 * Generated 2026-05-01 (php-eviction-phase2) from live PG information_schema.
 */

import {
  serial,
  smallint,
  timestamp,
  uniqueIndex,
  varchar,
  pgSchema,
} from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export const theme = vaisseauMereAcSchema.table(
  'cs_theme',
  {
    idTheme: serial('id_theme').primaryKey(),
    clientId: varchar('client_id', { length: 64 }).notNull(),
    colorPrimary: varchar('color_primary', { length: 9 }).notNull().default('#2563eb'),
    colorSecondary: varchar('color_secondary', { length: 9 }),
    colorBackground: varchar('color_background', { length: 9 }),
    colorForeground: varchar('color_foreground', { length: 9 }),
    colorMuted: varchar('color_muted', { length: 9 }),
    colorHeaderBg: varchar('color_header_bg', { length: 9 }),
    colorFooterBg: varchar('color_footer_bg', { length: 9 }),
    colorTopbarBg: varchar('color_topbar_bg', { length: 9 }),
    colorTopbarText: varchar('color_topbar_text', { length: 9 }),
    fontFamily: varchar('font_family', { length: 255 }),
    fontUrl: varchar('font_url', { length: 512 }),
    baseFontSize: varchar('base_font_size', { length: 8 }),
    borderRadius: varchar('border_radius', { length: 16 }).notNull().default('md'),
    contentWidth: varchar('content_width', { length: 16 }),
    shadow: smallint('shadow').notNull().default(1),
    defaultColorMode: varchar('default_color_mode', { length: 16 }).notNull().default('light'),
    active: smallint('active').notNull().default(1),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull().defaultNow(),
    dateUpd: timestamp('date_upd', { mode: 'date', precision: 0 }).notNull().defaultNow(),
  },
  (t) => ({
    ukThemeClient: uniqueIndex('uk_theme_client').on(t.clientId),
  }),
)
