

import { requireEmployeeSession } from '~/server/utils/session'
import {
  findExtraSlugClash,
  getEmployeeBaseInfo,
  upsertEmployeeExtra,
} from '~/internal/employeeextra/server/utils/employeeextra'

export default defineEventHandler(async (event) => {
  requireEmployeeSession(event)

  const id = Number(getRouterParam(event, 'id'))
  if (!id || id < 1) throw createError({ statusCode: 400, message: 'id invalide' })

  const body = await readBody<Record<string, any>>(event) || {}

  const emp = await getEmployeeBaseInfo(id, { event })
  if (!emp) throw createError({ statusCode: 404, message: 'Employé introuvable' })

  let slug = String(body.slug || '').trim().toLowerCase()
  if (!slug) {
    slug = `${emp.firstname || ''}-${emp.lastname || ''}`.trim().toLowerCase()
  }
  slug = slug
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 128) || `employe-${id}`

  const clash = await findExtraSlugClash(slug, id, { event }).catch(() => null)
  if (clash) {
    throw createError({ statusCode: 409, message: `Slug déjà utilisé par l'employé #${clash.id_employee}` })
  }

  const display_name = body.display_name != null ? String(body.display_name).trim().slice(0, 128) : null
  const bio          = body.bio != null ? String(body.bio) : null
  const expertise    = body.expertise != null ? String(body.expertise).slice(0, 255) : null
  const photo_url    = body.photo_url != null ? String(body.photo_url).slice(0, 255) : null
  const linkedin_url = body.linkedin_url != null ? String(body.linkedin_url).slice(0, 255) : null
  const active       = body.active === false || body.active === 0 ? 0 : 1

  try {
    await upsertEmployeeExtra({
      id_employee: id,
      slug,
      display_name,
      bio,
      expertise,
      photo_url,
      linkedin_url,
      active,
    }, { event })
  } catch (err: any) {
    if (String(err?.message || '').includes("doesn't exist")) {
      throw createError({
        statusCode: 503,
        message: 'Table cs_employee_extra absente — module ac_employeeextra requis sur ce tenant.',
      })
    }
    throw err
  }

  return { success: true, id, slug }
})
