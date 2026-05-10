/**
 *
 * Core Logic Splitting — AI prompt externalization.
 *
 * The client VPS only sends raw VARIABLES to the central server.
 * The central server:
 * 1. Injects the complex system prompts (proprietary)
 * 2. Calls Anthropic/OpenAI with its own key
 * 3. Applies the watermark
 * 4. Returns the response to the client
 *
 * The client never has access to system prompts — they remain on the central server.
 */

export interface ProxyAiRequest {
  clientId:    string
  taskType:    string     // 'broadcast' | 'nurturing' | 'transcreation' | 'youtube' | etc.
  variables:   Record<string, any>  // Données brutes du client (sujet, ton, etc.)
}

export interface ProxyAiResponse {
  ok:       boolean
  result:   any
  watermark?: string
}

/**
 * Calls the central server to execute an AI task.
 * The client sends the variables, the central server injects the prompts.
 */
export async function callMotherAi(request: ProxyAiRequest): Promise<ProxyAiResponse> {
  const motherUrl     = process.env.MOTHER_HUB_URL
  const webhookSecret = process.env.WEBHOOK_SECRET || process.env.MASTER_WEBHOOK_SECRET

  if (!motherUrl) {
    // Mode standalone (AC Hub lui-même) — appel IA direct
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

/**
 * Decides whether an AI task should go through the central server
 * or be executed locally.
 *
 * Logic: if the client has its own API key → local.
 * otherwise → proxy via the central server.
 */
export function shouldProxyAi(): boolean {
  const motherUrl = process.env.MOTHER_HUB_URL
  const localKey  = process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY

  // Pas de Vaisseau Mère configuré → local (AC Hub lui-même)
  if (!motherUrl) return false

  // Le client a sa propre clé → local
  if (localKey) return false

  // Pas de clé locale → proxy via le Mère
  return true
}
