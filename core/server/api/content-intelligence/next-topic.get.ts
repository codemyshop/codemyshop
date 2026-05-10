/**
 *
 * GET /api/content-intelligence/next-topic?clientId=ac-hub
 *
 * Returns the priority topic of the day based on:
 * - GSC (page 2 SEO acquisition opportunities)
 * - Matomo (high-intent queries, pages to rewrite)
 * - Fallback (backup topics if APIs are down)
 */
import { getNextTopic } from '../../services/content-intelligence'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const clientId = (query.clientId as string) || 'ac-hub'

  const topic = await getNextTopic(clientId)
  return topic
})
