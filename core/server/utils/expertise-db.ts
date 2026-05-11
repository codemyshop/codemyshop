

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
  
  includeFuture?: boolean
}

export async function listExpertise(filter: ListExpertiseFilter = {}): Promise<ExpertiseSummary[]> {
  return pg.listExpertisePg(filter)
}

export async function getExpertiseBySlug(slug: string): Promise<ExpertiseFull | null> {
  return pg.getExpertiseBySlugPg(slug)
}
