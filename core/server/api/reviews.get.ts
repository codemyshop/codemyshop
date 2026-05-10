/**
 *
 * GET /api/reviews?limit=N&offset=O
 *
 * Serves customer reviews for the current tenant from cs_reviews + metadata
 * de l'entreprise depuis cs_business (1 ligne par tenant).
 *
 * Multi-tenant via useClientDb(event) :
 * - hostname example-shop* → DB ps_example-shop on VPS example-shop-v2
 * - other hostnames → default mariadb (where cs_reviews
 * already exists for historical data)
 *
 * Fallback gracieux ER_NO_SUCH_TABLE → reviews=[], business=null. Permet
 * to deploy the code BEFORE the table has been created on a new tenant
 * (incidents 07/04 ordre code/DB).
 *
 * Contrat de sortie :
 *   reviews:  Review[]
 *   total:    number
 *   business: { name, url, gmaps_url, total_rating, total_reviews } | null
 * → used by CustomerReviews.vue for JSON-LD AggregateRating
 * (stars in Google SERP) and the "View all our reviews" CTA button.
 */
import { useClientDb } from '~/server/utils/db'
import { listActiveReviewsForClient } from '~/internal/hub/server/utils/hub'

export interface Review {
  author:  string
  company: string
  rating:  number
  title:   string
  text:    string
  date:    string
  source:  string
}

export interface BusinessMeta {
  name:           string
  url:            string
  gmaps_url:      string | null
  total_rating:   number | null
  total_reviews:  number | null
}

interface ReviewRow {
  author: string
  company: string
  rating: number
  title: string | null
  body: string
  review_date: string | Date
  source: string
}

interface BusinessRow {
  name: string
  url: string
  gmaps_url: string | null
  total_rating: number | null
  total_reviews: number | null
}

function extractTitle(text: string): string {
  const sentence = text.split(/[.!?\n]/)[0]?.trim() ?? ''
  return sentence.length > 80 ? sentence.slice(0, 77) + '…' : sentence
}

function isMissingTable(err: any): boolean {
  return err?.code === 'ER_NO_SUCH_TABLE' || err?.errno === 1146 || err?.code === '42P01'
}

export default defineEventHandler(async (event) => {
  const { limit = '6', offset = '0' } = getQuery(event)
  const db = useClientDb(event)

  let reviews: Review[] = []
  let business: BusinessMeta | null = null

  // 1) Avis (cs_reviews — schéma identique sur tous les tenants, façade ac_hub)
  try {
    const rows = await listActiveReviewsForClient({ event })
    reviews = rows.map(r => ({
      author:  r.author,
      company: r.company,
      rating:  Number(r.rating),
      title:   r.title || extractTitle(r.body),
      text:    r.body,
      date:    typeof r.review_date === 'string'
                 ? r.review_date
                 : new Date(r.review_date).toISOString().split('T')[0],
      source:  r.source,
    }))
  } catch (err: any) {
    if (!isMissingTable(err)) {
      console.error('[reviews] DB error:', err?.message)
    }
    // sinon : table absente → reviews=[]
  }

  // 2) Méta entreprise (cs_business — pour le JSON-LD tenant-aware)
  try {
    const rows = await db.query<BusinessRow>(
      `SELECT name, url, gmaps_url, total_rating, total_reviews
         FROM cs_business
        WHERE active = 1
        LIMIT 1`,
    )
    if (rows[0]) {
      business = {
        name:          rows[0].name,
        url:           rows[0].url,
        gmaps_url:     rows[0].gmaps_url,
        total_rating:  rows[0].total_rating !== null ? Number(rows[0].total_rating) : null,
        total_reviews: rows[0].total_reviews !== null ? Number(rows[0].total_reviews) : null,
      }
    }
  } catch (err: any) {
    if (!isMissingTable(err)) {
      console.error('[reviews] business meta error:', err?.message)
    }
  }

  const start = Number(offset)
  const end   = limit === 'all' ? reviews.length : start + Number(limit)

  return {
    reviews: reviews.slice(start, end),
    total:   reviews.length,
    business,
  }
})
