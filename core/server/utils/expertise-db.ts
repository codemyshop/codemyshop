/**
 *
 * Direct DB helpers for /api/expertise/* + sitemaps — doctrine
 * Zero PrestaShop webservice 2026-04-22. Table: cs_expertise
 * (AI-generated expertise sheets, single-tenant).
 *
 * Project #38 phase E (post-MariaDB migration): PostgreSQL-only thin wrapper,
 * The logic lives in `expertise-db-pg.ts`. Public types preserved
 * for consumers (sitemaps, /api/expertise/*).
 *
 * Technical debt note: `tags`, `ps_versions`, `faq` are stored as TEXT JSON →
 * Pre-existing NAMING.11 violation. Out of scope; to be normalized when
 * The editor sheet is redesigned.
 */

import * as pg from './expertise-db-pg'

export interface ExpertiseSummary {
  title: string
  slug: string
  metaDescription: string
  category: string
  subcategory: string
  tags: string[]
  difficulty: string
  psVersions: string[]
  tldr: string
  faqCount: number
  generatedAt: string
  publishDate: string
  url: string
  sourceUrl: string
  sourceTitle: string
  sourceCategory: string
  score: number
}

export interface ExpertiseFull extends ExpertiseSummary {
  content: string
  faq: Array<{ question: string; answer: string }>
}

export interface ListExpertiseFilter {
  category?: string
  difficulty?: string
  limit?: number
  /** all=true : inclut les non encore publiés (publish_date future). Défaut : false. */
  includeFuture?: boolean
}

/** Sorted by publish_date DESC, position ASC. */
export async function listExpertise(filter: ListExpertiseFilter = {}): Promise<ExpertiseSummary[]> {
  return pg.listExpertisePg(filter)
}

/** Read an expertise sheet by slug (detail mode, full HTML content). */
export async function getExpertiseBySlug(slug: string): Promise<ExpertiseFull | null> {
  return pg.getExpertiseBySlugPg(slug)
}
