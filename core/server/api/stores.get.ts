

import { useClientDb } from '../utils/db'

interface StoreApi {
  id: number
  slug: string
  name: string
  addressLine1: string
  addressLine2?: string | null
  postcode: string
  city: string
  region?: string | null
  country: string
  lat: number
  lng: number
  phone?: string | null
  email?: string | null
  websiteUrl?: string | null
  hours?: Record<string, string> | null
  hasWorkshop: boolean
  hasSchool: boolean
  description?: string | null
  metaTitle?: string | null
  metaDescription?: string | null
}

export default defineEventHandler(async (event): Promise<{ stores: StoreApi[] }> => {
  const db = useClientDb(event)
  const cfg = useRuntimeConfig(event)
  const clientId = String((cfg as any).clientId || '')
  const lang = String(getQuery(event).lang || 'fr')
  const idLang = lang === 'en' ? 2 : 1

  const rows = await db.query<any>(
    `SELECT s.id_store, s.slug, s.name, s.address_line1, s.address_line2,
            s.postcode, s.city, s.region, s.country,
            s.lat::float AS lat, s.lng::float AS lng,
            s.phone, s.email, s.website_url, s.hours_json,
            s.has_workshop, s.has_school,
            sl.description, sl.meta_title, sl.meta_description
       FROM cs_store s
  LEFT JOIN cs_store_lang sl ON sl.id_store = s.id_store AND sl.id_lang = ?
      WHERE s.client_id = ? AND s.active = 1
      ORDER BY s.position, s.city`,
    [idLang, clientId],
  )

  const stores: StoreApi[] = rows.map((r) => {
    let hours: Record<string, string> | null = null
    if (r.hours_json) {
      try { hours = JSON.parse(r.hours_json) } catch {  }
    }
    return {
      id: Number(r.id_store),
      slug: String(r.slug),
      name: String(r.name),
      addressLine1: String(r.address_line1),
      addressLine2: r.address_line2,
      postcode: String(r.postcode),
      city: String(r.city),
      region: r.region,
      country: String(r.country),
      lat: Number(r.lat),
      lng: Number(r.lng),
      phone: r.phone,
      email: r.email,
      websiteUrl: r.website_url,
      hours,
      hasWorkshop: Number(r.has_workshop) === 1,
      hasSchool: Number(r.has_school) === 1,
      description: r.description,
      metaTitle: r.meta_title,
      metaDescription: r.meta_description,
    }
  })

  return { stores }
})
