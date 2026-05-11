

export type FeedbackType     = 'feature' | 'improvement' | 'bug'
export type FeedbackStatus   = 'pending' | 'todo' | 'in_progress' | 'refused' | 'deployed'
export type FeedbackPriority = 'low' | 'medium' | 'high'

export interface FeedbackItem {
  id:                  string
  clientId:            string
  clientName:          string
  type:                FeedbackType
  description:         string
  priority:            FeedbackPriority
  status:              FeedbackStatus
  aiClassification?:   string
  technicalPrompt?:    string
  estimatedComplexity?: string
  createdAt:           string
  updatedAt:           string
}

const REDIS_KEY = 'hub:feedback'

async function getRedis() {
  try {
    return useStorage('redis')
  } catch {
    return null
  }
}

export async function readFeedbacks(): Promise<FeedbackItem[]> {
  const redis = await getRedis()
  if (redis) {
    try {
      const data = await redis.getItem<FeedbackItem[]>(REDIS_KEY)
      if (data) return data
    } catch {  }
  }
  return []
}

export async function writeFeedbacks(data: FeedbackItem[]) {
  const redis = await getRedis()
  if (redis) {
    await redis.setItem(REDIS_KEY, data)
  }
}
