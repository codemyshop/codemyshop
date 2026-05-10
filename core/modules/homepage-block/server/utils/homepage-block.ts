/**
 *
 * HomepageBlock facade — typed sub-items (slide/feature/category/banner/
 * narrative/persona/faq_item/...), FK section + parent_block_id for the
 * hierarchy + i18n.
 * Sources : `cs_homepage_block` + `cs_homepage_block_lang`,
 * owned by ac_homepageblock.
 *
 * Surface :
 * - listBlocksForSections (joined read _lang COALESCE for homepage-config / homepage-sections)
 * - deleteBlocksForSection (purge before re-inserting payload)
 *  - insertBlock (master + retour insertId)
 * - insertBlockLang (simple insert, filtered fields)
 * - upsertBlockLang (ON CONFLICT variant for multi-language PUT writes)
 *
 * Chantier #38 phase E — runtime PostgreSQL only (cs_main).
 * Read delegated to the pg facade (`./homepage-block-pg`); inline writes
 * via `usePocPg()` after MariaDB eviction.
 */

import { sql } from 'drizzle-orm'
import { usePocPg } from '../../../../server/db/drizzle-pg'
import * as pg from './homepage-block-pg'

interface HomepageBlockContext {
  event?: any
  clientId?: string
}

export interface BlockWithLangRow {
  id_block: number
  id_section: number
  parent_block_id: number | null
  block_kind: string
  position: number
  image: string | null
  icon: string | null
  href: string | null
  target: string | null
  slug: string | null
  extra_config_json: string | null
  label: string | null
  title: string | null
  subtitle: string | null
  sticker: string | null
  kicker: string | null
  description: string | null
  text: string | null
  header: string | null
  footer: string | null
  cta_label: string | null
  alt: string | null
  question: string | null
  answer_html: string | null
}

/**
 * Read of active blocks joined on _lang (idLang + fallback id_lang=1).
 * Only blocks with `active=1` are returned.
 */
export async function listBlocksForSections(
  sectionIds: number[],
  idLang: number,
  _ctx: HomepageBlockContext = {},
): Promise<BlockWithLangRow[]> {
  if (!sectionIds.length) return []
  return pg.listBlocksForSectionsPg(sectionIds, idLang)
}

export async function deleteBlocksForSection(
  idSection: number,
  _ctx: HomepageBlockContext = {},
): Promise<void> {
  await usePocPg().execute(sql`
    DELETE FROM cs_main.cs_homepage_block WHERE id_section = ${idSection}
  `)
}

export interface InsertBlockMasterInput {
  id_section: number
  parent_block_id?: number | null
  block_kind: string
  position: number
  image?: string | null
  icon?: string | null
  href?: string | null
  target?: string | null
  slug?: string | null
  extra_config_json?: string | null
  active?: number
}

export async function insertBlock(
  input: InsertBlockMasterInput,
  _ctx: HomepageBlockContext = {},
): Promise<number> {
  const insertResult = await usePocPg().execute(sql`
    INSERT INTO cs_main.cs_homepage_block
      (id_section, parent_block_id, block_kind, position, image, icon, href, target, slug, extra_config_json, active)
    VALUES (
      ${input.id_section},
      ${input.parent_block_id ?? null},
      ${input.block_kind},
      ${input.position},
      ${input.image ?? null},
      ${input.icon ?? null},
      ${input.href ?? null},
      ${input.target ?? null},
      ${input.slug ?? null},
      ${input.extra_config_json ?? null},
      ${input.active ?? 1}
    )
    RETURNING id_block
  `)
  return Number((insertResult as any[])[0]?.id_block || 0)
}

export const BLOCK_LANG_FIELDS = [
  'label', 'title', 'subtitle', 'sticker', 'kicker', 'description',
  'text', 'header', 'footer', 'cta_label', 'alt', 'question', 'answer_html',
] as const
export type BlockLangField = typeof BLOCK_LANG_FIELDS[number]

/**
 * Simple INSERT _lang. Filters values `undefined`/`null`/'' before insertion:
 * if no columns are populated, no-op.
 */
export async function insertBlockLang(
  idBlock: number,
  idLang: number,
  fields: Partial<Record<BlockLangField, any>>,
  _ctx: HomepageBlockContext = {},
): Promise<void> {
  const filtered: Partial<Record<BlockLangField, any>> = {}
  for (const f of BLOCK_LANG_FIELDS) {
    const v = fields[f]
    if (v !== undefined && v !== null && v !== '') filtered[f] = v
  }
  if (!Object.keys(filtered).length) return
  await usePocPg().execute(sql`
    INSERT INTO cs_main.cs_homepage_block_lang
      (id_block, id_lang, label, title, subtitle, sticker, kicker, description,
       text, header, footer, cta_label, alt, question, answer_html)
    VALUES (
      ${idBlock}, ${idLang},
      ${filtered.label ?? null},
      ${filtered.title ?? null},
      ${filtered.subtitle ?? null},
      ${filtered.sticker ?? null},
      ${filtered.kicker ?? null},
      ${filtered.description ?? null},
      ${filtered.text ?? null},
      ${filtered.header ?? null},
      ${filtered.footer ?? null},
      ${filtered.cta_label ?? null},
      ${filtered.alt ?? null},
      ${filtered.question ?? null},
      ${filtered.answer_html ?? null}
    )
  `)
}

/**
 * Upsert _lang: INSERT … ON CONFLICT (id_block, id_lang) DO UPDATE for all 13 fields.
 * Used by PUT /:id which rewrites languages in a loop.
 */
export async function upsertBlockLang(
  idBlock: number,
  idLang: number,
  fields: Partial<Record<BlockLangField, any>>,
  _ctx: HomepageBlockContext = {},
): Promise<void> {
  await usePocPg().execute(sql`
    INSERT INTO cs_main.cs_homepage_block_lang
      (id_block, id_lang, label, title, subtitle, sticker, kicker, description,
       text, header, footer, cta_label, alt, question, answer_html)
    VALUES (
      ${idBlock}, ${idLang},
      ${fields.label ?? null},
      ${fields.title ?? null},
      ${fields.subtitle ?? null},
      ${fields.sticker ?? null},
      ${fields.kicker ?? null},
      ${fields.description ?? null},
      ${fields.text ?? null},
      ${fields.header ?? null},
      ${fields.footer ?? null},
      ${fields.cta_label ?? null},
      ${fields.alt ?? null},
      ${fields.question ?? null},
      ${fields.answer_html ?? null}
    )
    ON CONFLICT (id_block, id_lang) DO UPDATE SET
      label       = EXCLUDED.label,
      title       = EXCLUDED.title,
      subtitle    = EXCLUDED.subtitle,
      sticker     = EXCLUDED.sticker,
      kicker      = EXCLUDED.kicker,
      description = EXCLUDED.description,
      text        = EXCLUDED.text,
      header      = EXCLUDED.header,
      footer      = EXCLUDED.footer,
      cta_label   = EXCLUDED.cta_label,
      alt         = EXCLUDED.alt,
      question    = EXCLUDED.question,
      answer_html = EXCLUDED.answer_html
  `)
}
