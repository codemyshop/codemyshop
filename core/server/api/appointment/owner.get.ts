

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
