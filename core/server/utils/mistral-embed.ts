

const MISTRAL_URL = 'https://api.mistral.ai/v1/embeddings'
const MISTRAL_MODEL = 'mistral-embed'
const EMBED_DIM = 1024
const CACHE_MAX = 200

const cache = new Map<string, number[]>()

function getCached(key: string): number[] | null {
  const v = cache.get(key)
  if (!v) return null
  
  cache.delete(key)
  cache.set(key, v)
  return v
}

function setCached(key: string, value: number[]) {
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
  cache.set(key, value)
}

function normalizeKey(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, ' ')
}

export function toPgVector(v: number[]): string {
  return '[' + v.map((x) => x.toFixed(6)).join(',') + ']'
}

export async function embedQuery(text: string): Promise<number[] | null> {
  const trimmed = text.trim()
  if (!trimmed) return null

  const key = normalizeKey(trimmed)
  const hit = getCached(key)
  if (hit) return hit

  const config = useRuntimeConfig()
  const apiKey = (config.mistralApiKey as string) || ''
  if (!apiKey) return null

  try {
    const res = await $fetch<{ data: { embedding: number[] }[] }>(MISTRAL_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: { model: MISTRAL_MODEL, input: [trimmed] },
      timeout: 5000,
    })
    const v = res?.data?.[0]?.embedding
    if (!Array.isArray(v) || v.length !== EMBED_DIM) return null
    setCached(key, v)
    return v
  } catch (err: any) {
    console.error('[mistral-embed] embedQuery failed:', err?.message || err)
    return null
  }
}

export function clearEmbedCache() {
  cache.clear()
}

export function getEmbedCacheStats() {
  return { size: cache.size, max: CACHE_MAX }
}
