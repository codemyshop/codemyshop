/**
 *
 * ac_homepageblock facade on the Postgres side — workstream #38 Phase 1 step 5,
 * flag PG_ENABLED_DOMAINS=homepage_block.
 *
 * Read-only surface: typed sub-items (slide/feature/category/banner/...).
 * Writes (back-office /sync.put) remain on MariaDB.
 */

import { sql } from 'drizzle-orm'
import { usePocPg } from '../../../../server/db/drizzle-pg'

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

export async function listBlocksForSectionsPg(
  sectionIds: number[],
  idLang: number,
): Promise<BlockWithLangRow[]> {
  if (!sectionIds.length) return []
  const result = await usePocPg().execute<any>(sql`
    SELECT b.id_block, b.id_section, b.parent_block_id, b.block_kind, b.position,
           b.image, b.icon, b.href, b.target, b.slug, b.extra_config_json,
           COALESCE(bl.label, blf.label)             AS label,
           COALESCE(bl.title, blf.title)             AS title,
           COALESCE(bl.subtitle, blf.subtitle)       AS subtitle,
           COALESCE(bl.sticker, blf.sticker)         AS sticker,
           COALESCE(bl.kicker, blf.kicker)           AS kicker,
           COALESCE(bl.description, blf.description) AS description,
           COALESCE(bl.text, blf.text)               AS text,
           COALESCE(bl.header, blf.header)           AS header,
           COALESCE(bl.footer, blf.footer)           AS footer,
           COALESCE(bl.cta_label, blf.cta_label)     AS cta_label,
           COALESCE(bl.alt, blf.alt)                 AS alt,
           COALESCE(bl.question, blf.question)       AS question,
           COALESCE(bl.answer_html, blf.answer_html) AS answer_html
      FROM cs_main.cs_homepage_block b
      LEFT JOIN cs_main.cs_homepage_block_lang bl  ON bl.id_block  = b.id_block AND bl.id_lang = ${idLang}
      LEFT JOIN cs_main.cs_homepage_block_lang blf ON blf.id_block = b.id_block AND blf.id_lang = 1
     WHERE b.id_section IN (${sql.join(sectionIds.map((id) => sql`${id}`), sql`, `)}) AND b.active = 1
     ORDER BY b.position ASC, b.id_block ASC
  `)
  return ((result as any) as any[]).map((r) => ({
    id_block: Number(r.id_block),
    id_section: Number(r.id_section),
    parent_block_id: r.parent_block_id == null ? null : Number(r.parent_block_id),
    block_kind: String(r.block_kind),
    position: Number(r.position),
    image: r.image,
    icon: r.icon,
    href: r.href,
    target: r.target,
    slug: r.slug,
    extra_config_json: r.extra_config_json,
    label: r.label,
    title: r.title,
    subtitle: r.subtitle,
    sticker: r.sticker,
    kicker: r.kicker,
    description: r.description,
    text: r.text,
    header: r.header,
    footer: r.footer,
    cta_label: r.cta_label,
    alt: r.alt,
    question: r.question,
    answer_html: r.answer_html,
  }))
}
