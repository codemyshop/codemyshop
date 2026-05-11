

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

export const snakeScoreVaisseau = vaisseauMereAcSchema.table(
  'cs_snake_score',
  snakeScoreColumns,
  snakeScoreIndexes,
)

export const snakeScoreSmoke = example-vapeV2Schema.table(
  'cs_snake_score',
  snakeScoreColumns,
  snakeScoreIndexes,
)

export const snakeScoreExample Shop = example-shopV2Schema.table(
  'cs_snake_score',
  snakeScoreColumns,
  snakeScoreIndexes,
)

export type SnakeScorePgRow = typeof snakeScoreVaisseau.$inferSelect
