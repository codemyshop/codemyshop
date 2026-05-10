/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /api/appointment/owner
 *
 * Slot owner for the left panel /rdv (avatar + name + expertise).
 * Convention: first active employee with photo in `cs_employee_extra`.
 * No new column on cs_appointment_availability — a tenant
 * typically has 1 owner. When we move to multi-owner support,
 * we add id_owner_employee on the availability side.
 *
 * Retour : { owner: { id, slug, name, title, image, linkedinUrl } | null }
 */

import { getDefaultActiveOwner } from '~/internal/employeeextra/server/utils/employeeextra'

export default defineEventHandler(async (event) => {
  let row: any = null
  try {
    row = await getDefaultActiveOwner({ event })
  } catch {
    return { owner: null }
  }

  if (!row) return { owner: null }

  return {
    owner: {
      id: Number(row.id),
      slug: row.slug || '',
      name: row.displayName || '',
      title: row.expertise || '',
      image: row.photoUrl || '',
      linkedinUrl: row.linkedinUrl || '',
    },
  }
})
