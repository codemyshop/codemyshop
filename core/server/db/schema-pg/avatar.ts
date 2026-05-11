

import {
  index,
  integer,
  serial,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  varchar,
  pgSchema,
} from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export const avatarDefinition = vaisseauMereAcSchema.table(
  'cs_avatar_definition',
  {
    idAvatarDefinition: serial('id_avatar_definition').primaryKey(),
    name: varchar('name', { length: 128 }).notNull(),
    slug: varchar('slug', { length: 128 }).notNull(),
    icon: varchar('icon', { length: 8 }).notNull().default('?'),
    colorClass: varchar('color_class', { length: 64 }).notNull().default('bg-violet-100 text-violet-700'),
    keywords: text('keywords'),
    toneRules: text('tone_rules'),
    buyingBehavior: text('buying_behavior'),
    painPoints: text('pain_points'),
    goals: text('goals'),
    objections: text('objections'),
    preferredChannels: varchar('preferred_channels', { length: 255 }),
    budgetRange: varchar('budget_range', { length: 64 }),
    decisionCycle: varchar('decision_cycle', { length: 64 }),
    contentPreferences: text('content_preferences'),
    demographics: text('demographics'),
    personas: text('personas'),
    pageTypeExpressionMap: text('page_type_expression_map'),
    active: smallint('active').notNull().default(1),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull().defaultNow(),
    dateUpd: timestamp('date_upd', { mode: 'date', precision: 0 }).notNull().defaultNow(),
  },
)

export const avatarProductTarget = vaisseauMereAcSchema.table(
  'cs_avatar_product_target',
  {
    idAvatarProductTarget: serial('id_avatar_product_target').primaryKey(),
    idAvatarDefinition: integer('id_avatar_definition').notNull(),
    idProduct: integer('id_product').notNull(),
    position: smallint('position').notNull().default(1),
    reason: text('reason'),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull().defaultNow(),
    dateUpd: timestamp('date_upd', { mode: 'date', precision: 0 }).notNull().defaultNow(),
  },
  (t) => ({
    uPosition: uniqueIndex('uq_avatar_product_target_pos').on(t.idAvatarDefinition, t.position),
    uProduct: uniqueIndex('uq_avatar_product_target_prod').on(t.idAvatarDefinition, t.idProduct),
    kAvatar: index('idx_avatar_product_target_avatar').on(t.idAvatarDefinition),
  }),
)

export type AvatarProductTargetRow = typeof avatarProductTarget.$inferSelect
export type AvatarProductTargetInsert = typeof avatarProductTarget.$inferInsert

export const avatarGeographicZone = vaisseauMereAcSchema.table(
  'cs_avatar_geographic_zone',
  {
    idAvatarGeographicZone: serial('id_avatar_geographic_zone').primaryKey(),
    idAvatarDefinition: integer('id_avatar_definition').notNull(),
    zoneType: varchar('zone_type', { length: 16 }).notNull().default('region'),
    zoneCode: varchar('zone_code', { length: 16 }).notNull(),
    zoneLabel: varchar('zone_label', { length: 96 }).notNull(),
    position: smallint('position').notNull().default(1),
    weight: smallint('weight').notNull().default(50),
    reason: text('reason'),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull().defaultNow(),
    dateUpd: timestamp('date_upd', { mode: 'date', precision: 0 }).notNull().defaultNow(),
  },
  (t) => ({
    uPosition: uniqueIndex('uq_avatar_geo_zone_pos').on(t.idAvatarDefinition, t.position),
    uZone: uniqueIndex('uq_avatar_geo_zone_code').on(t.idAvatarDefinition, t.zoneType, t.zoneCode),
    kAvatar: index('idx_avatar_geo_zone_avatar').on(t.idAvatarDefinition),
    kZone: index('idx_avatar_geo_zone_code').on(t.zoneType, t.zoneCode),
  }),
)

export type AvatarGeographicZoneRow = typeof avatarGeographicZone.$inferSelect
export type AvatarGeographicZoneInsert = typeof avatarGeographicZone.$inferInsert
