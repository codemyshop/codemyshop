

export interface ProxyAiRequest {
  clientId:    string
  taskType:    string     
  variables:   Record<string, any>  
}

export interface ProxyAiResponse {
  ok:       boolean
  result:   any
  watermark?: string
}

export async function callMotherAi(request: ProxyAiRequest): Promise<ProxyAiResponse> {
  const motherUrl     = process.env.MOTHER_HUB_URL
  const webhookSecret = process.env.WEBHOOK_SECRET || process.env.MASTER_WEBHOOK_SECRET

  if (!motherUrl) {
    
    return { ok: false, result: null }
  }

  try {
    const res = await $fetch<ProxyAiResponse>(`${motherUrl}/api/licensing/ai-proxy`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${webhookSecret}`,
        'Content-Type': 'application/json',
      },
      body: request,
      timeout: 30000,
    })

    return res
  } catch (err: any) {
    console.error('[prompt-proxy] Mother unreachable:', err?.message)
    return { ok: false, result: null }
  }
}

export function shouldProxyAi(): boolean {
  const motherUrl = process.env.MOTHER_HUB_URL
  const localKey  = process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY

  
  if (!motherUrl) return false

  
  if (localKey) return false

  
  return true
}
