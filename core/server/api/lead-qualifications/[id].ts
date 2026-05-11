

import { getQualification, upsertQualification, type UpsertQualificationInput } from '~/server/utils/lead-qualifications'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const method = getMethod(event)

  if (method === 'GET') {
    return await getQualification(id, event)
  }

  if (method === 'PUT') {
    const body = await readBody<UpsertQualificationInput>(event)
    const qualification = await upsertQualification(id, body, event)
    return { ok: true, qualification }
  }

  throw createError({ statusCode: 405, statusMessage: 'Method not allowed' })
})
