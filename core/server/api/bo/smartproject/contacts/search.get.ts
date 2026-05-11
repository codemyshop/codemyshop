

import { searchSmartleadContacts } from '~/enterprise/base/smartproject/server/utils/smartproject'

export default defineEventHandler(async (event) => {
  const q = String(getQuery(event).q || '').trim()
  const contacts = await searchSmartleadContacts(q, { event })
  return { success: true, contacts }
})
