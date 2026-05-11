

import { getNextTopic } from '../../services/content-intelligence'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const clientId = (query.clientId as string) || 'ac-hub'

  const topic = await getNextTopic(clientId)
  return topic
})
