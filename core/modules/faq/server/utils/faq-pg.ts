/**
 *
 * FAQ facade on PostgreSQL — Phase 1 step 6,
 * flag PG_ENABLED_DOMAINS=faq.
 *
 * read+write surface: list / replace / upsert i18n / delete (parallel
 * to faq.ts MariaDB). Polymorphic pattern preserved.
 */

import { and, asc, eq, sql } from 'drizzle-orm'
import { usePocPg } from '../../../../server/db/drizzle-pg'
import { faqVaisseau, faqLangVaisseau } from '../../../../server/db/schema-pg/faq'
import type { FaqItem, FaqParentType } from './faq'

export async function listFaqsByParentPg(
  parentType: FaqParentType,
  parentId: number,
  langId: number,
  options: { onlyActive?: boolean } = {},
): Promise<FaqItem[]> {
  const onlyActive = options.onlyActive ?? true
  const conds = [
    eq(faqVaisseau.parentType, parentType),
    eq(faqVaisseau.parentId, parentId),
  ]
  if (onlyActive) conds.push(eq(faqVaisseau.active, 1))

  const rows = await usePocPg()
    .select({
      id: faqVaisseau.idFaq,
      position: faqVaisseau.position,
      active: faqVaisseau.active,
      question: faqLangVaisseau.question,
      answer: faqLangVaisseau.answer,
    })
    .from(faqVaisseau)
    .leftJoin(
      faqLangVaisseau,
      and(eq(faqLangVaisseau.idFaq, faqVaisseau.idFaq), eq(faqLangVaisseau.idLang, langId)),
    )
    .where(and(...conds))
    .orderBy(asc(faqVaisseau.position), asc(faqVaisseau.idFaq))

  return rows.map((r) => ({
    id: Number(r.id),
    position: Number(r.position) || 0,
    active: !!r.active,
    question: r.question ?? '',
    answer: r.answer ?? '',
  }))
}

export async function replaceFaqsForParentPg(
  parentType: FaqParentType,
  parentId: number,
  langId: number,
  items: Array<{ position?: number; active?: boolean; question: string; answer: string }>,
): Promise<number> {
  const d = usePocPg()
  const existing = await d
    .select({ idFaq: faqVaisseau.idFaq })
    .from(faqVaisseau)
    .where(and(eq(faqVaisseau.parentType, parentType), eq(faqVaisseau.parentId, parentId)))

  if (existing.length > 0) {
    for (const r of existing) {
      await d.delete(faqLangVaisseau).where(eq(faqLangVaisseau.idFaq, r.idFaq))
    }
    await d
      .delete(faqVaisseau)
      .where(and(eq(faqVaisseau.parentType, parentType), eq(faqVaisseau.parentId, parentId)))
  }

  let inserted = 0
  for (let i = 0; i < items.length; i++) {
    const it = items[i]
    const question = String(it.question ?? '').trim()
    if (!question) continue
    const result = await d
      .insert(faqVaisseau)
      .values({
        parentType,
        parentId,
        position: it.position ?? i,
        active: it.active === false ? 0 : 1,
      })
      .returning({ idFaq: faqVaisseau.idFaq })
    const newId = Number(result?.[0]?.idFaq ?? 0)
    if (newId > 0) {
      await d.insert(faqLangVaisseau).values({
        idFaq: newId,
        idLang: langId,
        question: question.slice(0, 512),
        answer: String(it.answer ?? ''),
      })
      inserted++
    }
  }
  return inserted
}

export async function upsertFaqTranslationsPg(
  parentType: FaqParentType,
  parentId: number,
  langId: number,
  items: Array<{ id: number; question: string; answer: string }>,
): Promise<number> {
  const d = usePocPg()
  let count = 0
  for (const it of items) {
    const idFaq = Number(it.id)
    if (!Number.isFinite(idFaq) || idFaq <= 0) continue
    const question = String(it.question ?? '').trim()
    if (!question) continue
    const answer = String(it.answer ?? '')

    const owner = await d
      .select({ idFaq: faqVaisseau.idFaq })
      .from(faqVaisseau)
      .where(
        and(
          eq(faqVaisseau.idFaq, idFaq),
          eq(faqVaisseau.parentType, parentType),
          eq(faqVaisseau.parentId, parentId),
        ),
      )
      .limit(1)
    if (!owner.length) continue

    await d
      .insert(faqLangVaisseau)
      .values({ idFaq, idLang: langId, question: question.slice(0, 512), answer })
      .onConflictDoUpdate({
        target: [faqLangVaisseau.idFaq, faqLangVaisseau.idLang],
        set: { question: question.slice(0, 512), answer },
      })
    count++
  }
  return count
}

export async function deleteFaqsForParentPg(
  parentType: FaqParentType,
  parentId: number,
): Promise<number> {
  const d = usePocPg()
  const existing = await d
    .select({ idFaq: faqVaisseau.idFaq })
    .from(faqVaisseau)
    .where(and(eq(faqVaisseau.parentType, parentType), eq(faqVaisseau.parentId, parentId)))

  for (const r of existing) {
    await d.delete(faqLangVaisseau).where(eq(faqLangVaisseau.idFaq, r.idFaq))
  }
  await d
    .delete(faqVaisseau)
    .where(and(eq(faqVaisseau.parentType, parentType), eq(faqVaisseau.parentId, parentId)))
  return existing.length
}

// ──────────────────────────────────────────────────────────────
// Phase B4 — CRUD unitaire (miroir PG)
// ──────────────────────────────────────────────────────────────

import type { SaveSingleFaqInput, SaveSingleFaqResult } from './faq'

export async function saveSingleFaqPg(
  input: SaveSingleFaqInput,
): Promise<SaveSingleFaqResult> {
  const question = String(input.question ?? '').trim()
  const answer = String(input.answer ?? '').trim()
  if (!question || !answer) {
    return { ok: false, error: 'question et answer sont requis', status: 400 }
  }
  const d = usePocPg()
  const idFaq = Number(input.idFaq) || 0

  if (idFaq > 0) {
    const owner = await d
      .select({ idFaq: faqVaisseau.idFaq })
      .from(faqVaisseau)
      .where(
        and(
          eq(faqVaisseau.idFaq, idFaq),
          eq(faqVaisseau.parentType, input.parentType),
          eq(faqVaisseau.parentId, input.parentId),
        ),
      )
      .limit(1)
    if (!owner.length) return { ok: false, error: 'FAQ introuvable', status: 404 }

    if (typeof input.position === 'number' || typeof input.active === 'boolean') {
      const sets: any = {}
      if (typeof input.position === 'number') sets.position = input.position
      if (typeof input.active === 'boolean') sets.active = input.active ? 1 : 0
      await d.update(faqVaisseau).set(sets).where(eq(faqVaisseau.idFaq, idFaq))
    }
    await d
      .insert(faqLangVaisseau)
      .values({ idFaq, idLang: input.langId, question: question.slice(0, 512), answer })
      .onConflictDoUpdate({
        target: [faqLangVaisseau.idFaq, faqLangVaisseau.idLang],
        set: { question: question.slice(0, 512), answer },
      })
    return { ok: true, idFaq, created: false }
  }

  const result = await d
    .insert(faqVaisseau)
    .values({
      parentType: input.parentType,
      parentId: input.parentId,
      position: input.position ?? 0,
      active: input.active === false ? 0 : 1,
    })
    .returning({ idFaq: faqVaisseau.idFaq })
  const newId = Number(result?.[0]?.idFaq ?? 0)
  if (newId <= 0) return { ok: false, error: 'INSERT cs_faq KO', status: 500 }
  await d.insert(faqLangVaisseau).values({
    idFaq: newId,
    idLang: input.langId,
    question: question.slice(0, 512),
    answer,
  })
  return { ok: true, idFaq: newId, created: true }
}

export async function deleteFaqByIdPg(idFaq: number): Promise<boolean> {
  if (idFaq <= 0) return false
  const d = usePocPg()
  await d.delete(faqLangVaisseau).where(eq(faqLangVaisseau.idFaq, idFaq))
  const result: any = await d.delete(faqVaisseau).where(eq(faqVaisseau.idFaq, idFaq))
  return (result?.rowCount ?? 0) > 0 || true
}
