

import { sql } from 'drizzle-orm'
import { usePocPg } from '../db/drizzle-pg'

export interface MentorQuote {
  quote: string | null
  mentor: string | null
  source: string | null
}

export async function getMentorQuote(moduleSlug: string, lessonIndex: number): Promise<MentorQuote> {
  if (!moduleSlug) return { quote: null, mentor: null, source: null }
  const result = await usePocPg().execute(sql`
    SELECT quote, mentor, source
      FROM cs_main.cs_academy_mentor_quote
     WHERE module_slug = ${moduleSlug}
       AND lesson_index = ${lessonIndex}
     LIMIT 1
  `)
  const row = (result as any[])[0] ?? null
  return {
    quote: row?.quote || null,
    mentor: row?.mentor || null,
    source: row?.source || null,
  }
}

export interface QaRow {
  id_qa: number
  module_slug: string
  lesson_index: number
  id_student: number
  question: string
  ai_answer: string | null
  status: string
  upvotes: number
  date_add: string
  date_upd: string
  pseudo: string | null
  avatar_url: string | null
}

export async function getQaForModule(
  moduleSlug: string,
  lessonIndex: number | null,
  status = 'published',
): Promise<QaRow[]> {
  if (!moduleSlug) return []
  const lessonClause = lessonIndex !== null
    ? sql`AND qa.lesson_index = ${lessonIndex}`
    : sql``
  const result = await usePocPg().execute(sql`
    SELECT qa.id_qa, qa.module_slug, qa.lesson_index, qa.id_student,
           qa.question, qa.ai_answer, qa.status, qa.upvotes,
           qa.date_add, qa.date_upd,
           s.pseudo, s.avatar_url
      FROM cs_main.cs_academy_qa qa
 LEFT JOIN cs_main.cs_academy_student s ON s.id_student = qa.id_student
     WHERE qa.module_slug = ${moduleSlug}
       AND qa.status = ${status}
       ${lessonClause}
     ORDER BY qa.upvotes DESC, qa.date_add DESC
  `)
  return (result as unknown as QaRow[]) ?? []
}

export async function getSuggestion(moduleSlug: string, lessonIndex: number): Promise<string | null> {
  if (!moduleSlug) return null
  const result = await usePocPg().execute(sql`
    SELECT question FROM cs_main.cs_academy_suggestion
     WHERE module_slug = ${moduleSlug}
       AND lesson_index = ${lessonIndex}
     LIMIT 1
  `)
  const row = (result as unknown as { question: string }[])[0] ?? null
  return row?.question || null
}

export async function upsertSuggestion(
  moduleSlug: string,
  lessonIndex: number,
  question: string,
): Promise<void> {
  await usePocPg().execute(sql`
    INSERT INTO cs_main.cs_academy_suggestion (module_slug, lesson_index, question, date_add, date_upd)
    VALUES (${moduleSlug}, ${lessonIndex}, ${question}, NOW(), NOW())
    ON CONFLICT (module_slug, lesson_index) DO UPDATE SET
      question = EXCLUDED.question,
      date_upd = NOW()
  `)
}

export async function incrementQaUpvote(idQa: number): Promise<number | null> {
  if (idQa <= 0) return null
  const d = usePocPg()
  const result = await d.execute(sql`
    SELECT id_qa, upvotes, status FROM cs_main.cs_academy_qa WHERE id_qa = ${idQa} LIMIT 1
  `)
  const qa = (result as unknown as { id_qa: number; upvotes: number; status: string }[])[0] ?? null
  if (!qa || qa.status !== 'published') return null
  await d.execute(sql`UPDATE cs_main.cs_academy_qa SET upvotes = upvotes + 1 WHERE id_qa = ${idQa}`)
  return Number(qa.upvotes) + 1
}

export async function updateQaAiAnswer(
  idQa: number,
  aiAnswer: string,
  status: 'pending' | 'published' | 'flagged' = 'published',
): Promise<{ ok: boolean; error?: string }> {
  if (idQa <= 0) return { ok: false, error: 'id_qa requis' }
  const d = usePocPg()
  const result = await d.execute(sql`
    SELECT id_qa FROM cs_main.cs_academy_qa WHERE id_qa = ${idQa} LIMIT 1
  `)
  const exists = (result as unknown as { id_qa: number }[])[0] ?? null
  if (!exists) return { ok: false, error: 'Q&A introuvable' }
  await d.execute(sql`
    UPDATE cs_main.cs_academy_qa
       SET ai_answer = ${aiAnswer},
           status = ${status},
           date_upd = NOW()
     WHERE id_qa = ${idQa}
  `)
  return { ok: true }
}
