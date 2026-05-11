

export interface CategoryFaq {
  
  id?: number
  position: number
  active: boolean
  question: string
  
  answer: string
}

export interface LinkedBlogPost {
  
  id: number
  
  position: number
  title: string
  slug: string
  datePublished?: string | null
  cover?: string | null
}

export interface CmsSearchResult {
  id: number
  title: string
  slug: string
  datePublished?: string | null
  active: boolean
}
