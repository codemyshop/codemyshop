

import {
  countLearnersFiltered,
  listTopLearners,
} from '~/internal/academy/server/utils/academy'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const type = query.type as string | undefined
  const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)))

  try {
    const [learners, total] = await Promise.all([
      listTopLearners(type, limit, { event }),
      countLearnersFiltered(type, { event }),
    ])
    return { learners, total }
  } catch (err: any) {
    console.error('[academy/leaderboard] DB error:', err.message)
    return { learners: [], total: 0 }
  }
})
