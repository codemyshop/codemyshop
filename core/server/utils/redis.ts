

import { useStorage } from 'nitropack/runtime'

type Storage = ReturnType<typeof useStorage>

function getRedis(): Storage | null {
  try {
    return useStorage('redis')
  } catch {
    return null
  }
}

export async function cachedFetch<T>(
  key:     string,
  ttlSec:  number,
  factory: () => Promise<T>,
): Promise<T> {
  const redis = getRedis()
  if (redis) {
    try {
      const hit = await redis.getItem<{ v: T; exp: number }>(`cache:${key}`)
      if (hit && hit.exp > Date.now()) return hit.v
    } catch {  }
  }
  const value = await factory()
  if (redis) {
    try {
      await redis.setItem(`cache:${key}`, { v: value, exp: Date.now() + ttlSec * 1000 })
    } catch {  }
  }
  return value
}

export async function invalidateCache(key: string): Promise<void> {
  const redis = getRedis()
  if (!redis) return
  try {
    await redis.removeItem(`cache:${key}`)
  } catch {  }
}

export async function rateLimit(
  key:       string,
  max:       number,
  windowSec: number,
): Promise<boolean> {
  const redis = getRedis()
  if (!redis) return true   
  const fullKey = `ratelimit:${key}`
  try {
    
    
    const cur = (await redis.getItem<{ c: number; exp: number }>(fullKey))
    const now = Date.now()
    if (cur && cur.exp > now) {
      if (cur.c >= max) return false
      cur.c += 1
      await redis.setItem(fullKey, cur)
      return true
    }
    await redis.setItem(fullKey, { c: 1, exp: now + windowSec * 1000 })
    return true
  } catch {
    return true   
  }
}

export async function withLock<T>(
  key:   string,
  ttlMs: number,
  fn:    () => Promise<T>,
): Promise<T | null> {
  const redis = getRedis()
  if (!redis) return await fn()   
  const fullKey = `lock:${key}`
  try {
    const existing = await redis.getItem(fullKey)
    if (existing) return null
    await redis.setItem(fullKey, { acquiredAt: Date.now(), ttl: ttlMs })
    try {
      return await fn()
    } finally {
      try { await redis.removeItem(fullKey) } catch {}
    }
  } catch {
    return await fn()
  }
}
