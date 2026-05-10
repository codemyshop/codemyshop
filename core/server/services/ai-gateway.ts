/**
 *
 * AI Gateway — Moteur IA Agnostique Multi-Provider.
 *
 * Routes AI calls to the appropriate provider based on client configuration:
 * 1. Mistral AI (data sovereignty priority — FR data, EU API)
 *   2. Anthropic Claude (performance premium)
 * 3. OpenAI GPT (broad compatibility)
 *
 * Each client chooses their provider in cs_client_vps (DB).
 * Automatic fallback: if the main provider is down,
 * try the others in priority order.
 *
 * Variables d'environnement :
 * MISTRAL_API_KEY    — Mistral AI API key
 * ANTHROPIC_API_KEY  — Anthropic API key (Claude)
 * OPENAI_API_KEY     — OpenAI API key
 */

// ── Types ─────────────────────────────────────────────────────────────────

export type AIProvider = 'mistral' | 'anthropic' | 'openai'

export interface AIRequest {
  prompt: string
  systemPrompt?: string
  provider?: AIProvider
  model?: string
  maxTokens?: number
  temperature?: number
}

export interface AIResponse {
  content: string
  provider: AIProvider
  model: string
  tokensUsed: { input: number; output: number }
  durationMs: number
}

// ── Modèles par défaut ────────────────────────────────────────────────────

const DEFAULT_MODELS: Record<AIProvider, string> = {
  mistral:   'mistral-large-latest',
  anthropic: 'claude-sonnet-4-6',
  openai:    'gpt-4o',
}

// ── Ordre de fallback (souveraineté d'abord) ──────────────────────────────

const FALLBACK_ORDER: AIProvider[] = ['mistral', 'anthropic', 'openai']

// ── Fonction principale ───────────────────────────────────────────────────

/**
 * Generates content via the configured AI provider.
 * Automatic fallback if the main provider is unavailable.
 */
export async function generateContent(req: AIRequest): Promise<AIResponse> {
  const provider = req.provider ?? 'mistral'
  const model    = req.model ?? DEFAULT_MODELS[provider]

  // Essayer le provider demandé d'abord, puis fallback
  const order = [provider, ...FALLBACK_ORDER.filter(p => p !== provider)]

  for (const p of order) {
    const key = getApiKey(p)
    if (!key) continue

    try {
      const start = Date.now()
      const result = await callProvider(p, {
        ...req,
        model: p === provider ? model : DEFAULT_MODELS[p],
      }, key)

      return {
        ...result,
        provider: p,
        durationMs: Date.now() - start,
      }
    } catch (err: any) {
      console.warn(`[ai-gateway] ${p} échoué: ${err?.message?.slice(0, 100)}`)
      if (p === order[order.length - 1]) {
        throw new Error(`[ai-gateway] Tous les providers IA sont down: ${err?.message}`)
      }
      console.log(`[ai-gateway] Fallback → ${order[order.indexOf(p) + 1]}`)
    }
  }

  throw new Error('[ai-gateway] Aucun provider IA disponible')
}

// ── Résolution clé API ────────────────────────────────────────────────────

function getApiKey(provider: AIProvider): string | null {
  switch (provider) {
    case 'mistral':   return process.env.MISTRAL_API_KEY ?? null
    case 'anthropic': return process.env.ANTHROPIC_API_KEY ?? null
    case 'openai':    return process.env.OPENAI_API_KEY ?? null
  }
}

// ── Appels provider ───────────────────────────────────────────────────────

async function callProvider(
  provider: AIProvider,
  req: AIRequest,
  apiKey: string
): Promise<Omit<AIResponse, 'durationMs'>> {
  switch (provider) {
    case 'mistral':   return callMistral(req, apiKey)
    case 'anthropic': return callAnthropicGateway(req, apiKey)
    case 'openai':    return callOpenAI(req, apiKey)
  }
}

// ── Mistral AI (Souverain — API EU) ───────────────────────────────────────

async function callMistral(req: AIRequest, apiKey: string): Promise<Omit<AIResponse, 'durationMs'>> {
  const model = req.model ?? 'mistral-large-latest'

  const messages: any[] = []
  if (req.systemPrompt) messages.push({ role: 'system', content: req.systemPrompt })
  messages.push({ role: 'user', content: req.prompt })

  const response = await $fetch<any>('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: {
      model,
      messages,
      max_tokens: req.maxTokens ?? 4096,
      temperature: req.temperature ?? 0.7,
    },
    timeout: 120000,
  })

  return {
    content: response.choices?.[0]?.message?.content ?? '',
    provider: 'mistral',
    model,
    tokensUsed: {
      input:  response.usage?.prompt_tokens ?? 0,
      output: response.usage?.completion_tokens ?? 0,
    },
  }
}

// ── Anthropic Claude ──────────────────────────────────────────────────────

async function callAnthropicGateway(req: AIRequest, apiKey: string): Promise<Omit<AIResponse, 'durationMs'>> {
  const result = await callAnthropicRaw({
    apiKey,
    model: req.model,
    systemPrompt: req.systemPrompt,
    userPrompt: req.prompt,
    maxTokens: req.maxTokens ?? 4096,
    temperature: req.temperature ?? 0.7,
  })

  return {
    content: result.content,
    provider: 'anthropic',
    model: result.model,
    tokensUsed: {
      input: result.inputTokens,
      output: result.outputTokens,
    },
  }
}

// ── OpenAI GPT ────────────────────────────────────────────────────────────

async function callOpenAI(req: AIRequest, apiKey: string): Promise<Omit<AIResponse, 'durationMs'>> {
  const model = req.model ?? 'gpt-4o'

  const messages: any[] = []
  if (req.systemPrompt) messages.push({ role: 'system', content: req.systemPrompt })
  messages.push({ role: 'user', content: req.prompt })

  const response = await $fetch<any>('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: {
      model,
      messages,
      max_tokens: req.maxTokens ?? 4096,
      temperature: req.temperature ?? 0.7,
    },
    timeout: 120000,
  })

  return {
    content: response.choices?.[0]?.message?.content ?? '',
    provider: 'openai',
    model,
    tokensUsed: {
      input:  response.usage?.prompt_tokens ?? 0,
      output: response.usage?.completion_tokens ?? 0,
    },
  }
}

// ── Helper : résoudre le provider d'un client ─────────────────────────────

/**
 * Reads the AI configuration of a client from cs_client_vps (DB) via the service facade.
 */
export async function resolveClientAI(clientId: string): Promise<{ provider: AIProvider; model: string }> {
  try {
    const { getClientVpsConfigJson } = await import('~/internal/hub/server/utils/hub')
    const json = await getClientVpsConfigJson(clientId)
    if (json) {
      const parsed = JSON.parse(json)
      return {
        provider: parsed?.ai_provider ?? 'mistral',
        model:    parsed?.ai_model ?? DEFAULT_MODELS[parsed?.ai_provider ?? 'mistral'],
      }
    }
  } catch {}
  return { provider: 'mistral', model: DEFAULT_MODELS.mistral }
}
