/**
 *
 * Drizzle PG schema — blog comments domain.
 * Generated 2026-05-01 (php-eviction-phase2) from live PG information_schema.
 */

import {
  integer,
  serial,
  text,
  timestamp,
  varchar,
  pgSchema,
} from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export const blogComments = vaisseauMereAcSchema.table(
  'cs_blog_comments',
  {
    idComment: serial('id_comment').primaryKey(),
    idCms: integer('id_cms').notNull(),
    articleSlug: varchar('article_slug', { length: 255 }),
    author: varchar('author', { length: 100 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    content: text('content').notNull(),
    status: varchar('status', { length: 8 }).notNull().default('pending'),
    aiResponse: text('ai_response'),
    aiRespondedAt: timestamp('ai_responded_at', { mode: 'date', precision: 0 }),
    ip: varchar('ip', { length: 45 }),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull(),
    dateUpd: timestamp('date_upd', { mode: 'date', precision: 0 }).notNull(),
  },
)
