

const MASK_PATTERN = /^\u2022+$|^\*+$/  

export default defineEventHandler(async (event) => {
  const method = getMethod(event)

  
  if (method === 'GET') {
    const { clientId } = getQuery(event)
    const id = (clientId as string) || 'ac-hub'

    
    const hasPsKey = hasStoredKey(id, 'prestashopKey')
    const hasAiKey = hasStoredKey(id, 'aiApiKey')

    
    const keys = readApiKeys(id)

    return {
      prestashopUrl: keys.prestashopUrl ?? '',
      prestashopKey: hasPsKey ? maskKey(keys.prestashopKey) : '',
      aiProvider:    keys.aiProvider ?? 'anthropic',
      aiApiKey:      hasAiKey ? maskKey(keys.aiApiKey) : '',
      aiModel:       keys.aiModel ?? 'claude-sonnet-4-6',
      updatedAt:     keys.updatedAt ?? null,
      
      hasPsKey,
      hasAiKey,
      envPsKeySet: !!process.env[`PS_API_KEY_${id.toUpperCase().replace(/-/g, '_')}`],
      envAiKeySet: !!(useRuntimeConfig().anthropicApiKey),
    }
  }

  
  if (method === 'POST') {
    const body = await readBody<{
      clientId:       string
      prestashopUrl?: string
      prestashopKey?: string
      aiProvider?:    string
      aiApiKey?:      string
      aiModel?:       string
    }>(event)

    if (!body.clientId) {
      throw createError({ statusCode: 400, message: 'clientId requis' })
    }

    const patch: Partial<{
      prestashopUrl: string
      prestashopKey: string
      aiProvider:    string
      aiApiKey:      string
      aiModel:       string
    }> = {}

    
    if (body.prestashopUrl !== undefined) patch.prestashopUrl = body.prestashopUrl.trim()
    if (body.aiProvider    !== undefined) patch.aiProvider    = body.aiProvider
    if (body.aiModel       !== undefined) patch.aiModel       = body.aiModel.trim()

    
    if (body.prestashopKey && !isMasked(body.prestashopKey)) {
      patch.prestashopKey = body.prestashopKey.trim()
    }
    if (body.aiApiKey && !isMasked(body.aiApiKey)) {
      patch.aiApiKey = body.aiApiKey.trim()
    }

    writeApiKeys(body.clientId, patch)

    return { ok: true }
  }

  throw createError({ statusCode: 405, message: 'Method not allowed' })
})

function isMasked(value: string): boolean {
  if (!value) return true
  
  if (value.includes('\u2022')) return true
  
  if (/^\*+$/.test(value)) return true
  
  if (/^.{1,6}\u2022{4,}/.test(value)) return true
  return false
}
