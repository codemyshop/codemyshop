/**
 * Postgres POC schema for cs_snake_score (task #38 db-pg-pgvector,
 * Phase 0 step 2). Adapts the MySQL schema (core/server/db/schema/drill.ts:117)
 * using drizzle-orm/pg-core. The definition remains structurally
 * identique : meme nom de table, memes colonnes, memes index.
 *
 * Mapping types MariaDB -> PG :
 * - INT UNSIGNED AUTO_INCREMENT -> serial (sufficient for leaderboard, not
 *   besoin de bigserial)
 * - VARCHAR(12) -> identique
 * - INT NOT NULL DEFAULT 0 -> integer NOT NULL DEFAULT 0
 * - DATETIME -> timestamp (without timezone, to match MariaDB
 * current, where everything is in implicit UTC on the app side)
 *
 * The table resides in the cs_main schema (initialized by
 * postgres/init/01-init.sql). For other tenants, use
 * pgSchema('example-vape_v2') or pgSchema('example_v2') with the same
 * definition de colonnes.
 */
import { index, integer, pgSchema, serial, timestamp, varchar } from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')
export const example-vapeV2Schema = pgSchema('example-vape_v2')
export const example-shopV2Schema = pgSchema('example_v2')

const snakeScoreColumns = {
  idSnakeScore: serial('id_snake_score').primaryKey(),
  pseudo: varchar('pseudo', { length: 12 }).notNull(),
  score: integer('score').notNull().default(0),
  dateAdd: timestamp('date_add', { mode: 'date' }).notNull(),
}

const snakeScoreIndexes = (t: { score: any }) => ({
  kScore: index('idx_score').on(t.score),
})

/** Leaderboard mini-jeu Snake — schema cs_main. */
export const snakeScoreVaisseau = vaisseauMereAcSchema.table(
  'cs_snake_score',
  snakeScoreColumns,
  snakeScoreIndexes,
)

/** Leaderboard mini-jeu Snake — schema example-vape_v2 (cible POC Phase 0). */
export const snakeScoreSmoke = example-vapeV2Schema.table(
  'cs_snake_score',
  snakeScoreColumns,
  snakeScoreIndexes,
)

/** Leaderboard mini-jeu Snake — schema example_v2 (cohabitation Phase 2). */
export const snakeScoreExample Shop = example-shopV2Schema.table(
  'cs_snake_score',
  snakeScoreColumns,
  snakeScoreIndexes,
)

export type SnakeScorePgRow = typeof snakeScoreVaisseau.$inferSelect
