/**
 *
 * FAQ facade — thin wrapper PG-only (post Phase E.3, 2026-04-30).
 * All FAQ operations are delegated to `./faq-pg.ts` (PostgreSQL).
 *
 * Pattern polymorphique : (parent_type, parent_id) — cms, category, product…
 */

import * as pg from './faq-pg'

export type FaqParentType = 'cms' | 'category' | 'product' | (string & {})

export interface FaqItem {
  id: number
  position: number
  active: boolean
  question: string
  answer: string
}

interface FaqContext {
  event?: any
  clientId?: string
}

export async function listFaqsByParent(
  parentType: FaqParentType,
  parentId: number,
  langId: number,
  _ctx: FaqContext = {},
  options: { onlyActive?: boolean } = {},
): Promise<FaqItem[]> {
  return pg.listFaqsByParentPg(parentType, parentId, langId, options)
}

export async function replaceFaqsForParent(
  parentType: FaqParentType,
  parentId: number,
  langId: number,
  items: Array<{ position?: number; active?: boolean; question: string; answer: string }>,
  _ctx: FaqContext = {},
): Promise<number> {
  return pg.replaceFaqsForParentPg(parentType, parentId, langId, items)
}

export async function upsertFaqTranslations(
  parentType: FaqParentType,
  parentId: number,
  langId: number,
  items: Array<{ id: number; question: string; answer: string }>,
  _ctx: FaqContext = {},
): Promise<number> {
  return pg.upsertFaqTranslationsPg(parentType, parentId, langId, items)
}

export async function deleteFaqsForParent(
  parentType: FaqParentType,
  parentId: number,
  _ctx: FaqContext = {},
): Promise<number> {
  return pg.deleteFaqsForParentPg(parentType, parentId)
}

// ──────────────────────────────────────────────────────────────
// CRUD unitaire (AdminFaqEditor.vue)
// ──────────────────────────────────────────────────────────────

export interface SaveSingleFaqInput {
  parentType: FaqParentType
  parentId: number
  langId: number
  idFaq?: number
  question: string
  answer: string
  position?: number
  active?: boolean
}

export type SaveSingleFaqResult =
  | { ok: true; idFaq: number; created: boolean }
  | { ok: false; error: string; status: number }

export async function saveSingleFaq(
  input: SaveSingleFaqInput,
  _ctx: FaqContext = {},
): Promise<SaveSingleFaqResult> {
  const question = String(input.question ?? '').trim()
  const answer = String(input.answer ?? '').trim()
  if (!question || !answer) {
    return { ok: false, error: 'question et answer sont requis', status: 400 }
  }
  return pg.saveSingleFaqPg(input)
}

export async function deleteFaqById(
  idFaq: number,
  _ctx: FaqContext = {},
): Promise<boolean> {
  if (idFaq <= 0) return false
  return pg.deleteFaqByIdPg(idFaq)
}
