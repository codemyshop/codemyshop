

import { sql } from 'drizzle-orm'
import { usePocPg } from '../db/drizzle-pg'

export interface AuthorRow {
  id: number
  firstname: string
  lastname: string
  displayName: string
  slug: string
  bio: string
  expertise: string
  photoUrl: string
  linkedinUrl: string
  active: boolean
}

export async function listAuthors(): Promise<AuthorRow[]> {
  const result = await usePocPg().execute(sql`
    SELECT e.id_employee, e.firstname, e.lastname,
           ee.slug, ee.display_name, ee.bio, ee.expertise,
           ee.photo_url, ee.linkedin_url, ee.active AS author_active
      FROM cs_main.cs_employee_extra ee
      JOIN cs_main.ps_employee e ON e.id_employee = ee.id_employee
     ORDER BY ee.display_name ASC
  `)
  const rows = (result as any[]) ?? []
  return rows.map((r): AuthorRow => {
    const firstname = String(r.firstname || '')
    const lastname = String(r.lastname || '')
    return {
      id: Number(r.id_employee),
      firstname,
      lastname,
      displayName: String(r.display_name || `${firstname} ${lastname}`.trim()),
      slug: String(r.slug || ''),
      bio: String(r.bio || ''),
      expertise: String(r.expertise || ''),
      photoUrl: String(r.photo_url || ''),
      linkedinUrl: String(r.linkedin_url || ''),
      active: Number(r.author_active) !== 0,
    }
  })
}
