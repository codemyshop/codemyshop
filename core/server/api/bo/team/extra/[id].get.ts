

import { requireEmployeeSession } from '~/server/utils/session'
import { getEmployeeExtraById } from '~/internal/employeeextra/server/utils/employeeextra'

export default defineEventHandler(async (event) => {
  requireEmployeeSession(event)

  const id = Number(getRouterParam(event, 'id'))
  if (!id || id < 1) throw createError({ statusCode: 400, message: 'id invalide' })

  let row: Awaited<ReturnType<typeof getEmployeeExtraById>> = null
  try {
    row = await getEmployeeExtraById(id, { event })
  } catch {
    return {
      extra: emptyExtra(id),
      exists: false,
      tableMissing: true,
    }
  }

  return {
    extra: row || emptyExtra(id),
    exists: !!row,
    tableMissing: false,
  }
})

function emptyExtra(id: number) {
  return {
    id_employee: id,
    slug: '',
    display_name: '',
    bio: '',
    expertise: '',
    photo_url: '',
    linkedin_url: '',
    active: 1,
  }
}
