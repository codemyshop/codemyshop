/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * Snake game scores — Drizzle PG direct on cs_snake_score (v1.1.0).
 * Phase 9b.4d headless-modules-ts — cleanup after MariaDB removal (#44).
 */

import { desc } from 'drizzle-orm'
import { usePocPg } from '../db/drizzle-pg'
import { snakeScoreVaisseau } from '../db/schema-pg/snake-score'

export interface SnakeScore {
  id: number
  pseudo: string
  score: number
  createdAt: string
}

/** Top N scores triés par score desc — défaut 10 (leaderboard front). */
export async function readSnakeScores(_event?: any, limit = 10): Promise<SnakeScore[]> {
  const cap = Math.max(1, Math.min(100, limit))
  const rows = await usePocPg()
    .select()
    .from(snakeScoreVaisseau)
    .orderBy(desc(snakeScoreVaisseau.score))
    .limit(cap)
  return rows.map((r) => ({
    id: Number(r.idSnakeScore),
    pseudo: r.pseudo,
    score: Number(r.score),
    createdAt: (r.dateAdd as Date).toISOString(),
  }))
}

/** Inserts a score. Returns the inserted row. */
export async function insertSnakeScore(
  pseudo: string,
  score: number,
  _event?: any,
): Promise<SnakeScore> {
  const cleanPseudo = pseudo.trim().slice(0, 12)
  if (!cleanPseudo) throw new Error('pseudo requis')
  const safeScore = Math.max(0, Math.floor(score))
  const now = new Date()

  const [r] = await usePocPg()
    .insert(snakeScoreVaisseau)
    .values({ pseudo: cleanPseudo, score: safeScore, dateAdd: now })
    .returning({ id: snakeScoreVaisseau.idSnakeScore })
  return {
    id: Number(r?.id || 0),
    pseudo: cleanPseudo,
    score: safeScore,
    createdAt: now.toISOString(),
  }
}
