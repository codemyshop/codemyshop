

import { listAuthors } from '~/server/utils/hub-authors-db'

export default defineEventHandler(async () => {
  return await listAuthors()
})
