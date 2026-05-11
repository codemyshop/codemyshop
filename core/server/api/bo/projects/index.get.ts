

import { listActiveSmartProjects } from '~/enterprise/base/smartproject/server/utils/smartproject'

export default defineEventHandler(async (event) => {
  try {
    const projects = await listActiveSmartProjects({ event })
    return { projects }
  } catch (err: any) {
    if (err?.code === 'ER_NO_SUCH_TABLE' || err?.errno === 1146) {
      return { projects: [] }
    }
    console.error('[bo/projects] DB error:', err?.message)
    return { projects: [] }
  }
})
