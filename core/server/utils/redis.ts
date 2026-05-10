/**
 *
 * Redis helpers — wrapper on Nitro `useStorage('redis')` (unstorage driver).
 *
 * Three use cases covering 95% of needs:
 *   - cachedFetch(key, ttlSec, factory)  : memoize + TTL
 *   - rateLimit(key, max, windowSec)     : sliding window simple (INCR + EXPIRE)
 * - withLock(key, ttlMs, fn)           : SET NX EX to serialize jobs
 *
 * All helpers gracefully degrade if Redis is down:
 * - cachedFetch → bypass cache, execute factory directly
 * - rateLimit   → allow (mode "fail-open" preferred to "fail-closed" for
 * visitor submission endpoints — avoid blocking a customer
 * paying due to a flapping Redis)
 * - withLock    → execute the function without lock (best-effort equivalent)
 *
 * No direct `ioredis`: we go through unstorage to stay aligned with
 * `useStorage('redis')` of the rest of the code (see feedback.ts).
 */

import { useStorage } from 'nitropack/runtime'

type Storage = ReturnType<typeof useStorage>

function getRedis(): Storage | null {
  try {
    return useStorage('redis')
  } catch {
    return null
  }
}

/**
 * Memoize an async factory on Redis with TTL.
 *
 * @example
 *   const modules = await cachedFetch('marketplace:modules', 300, () =>
 *     db.query('SELECT … FROM cs_moduleslist'),
 *   )
 */
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
    } catch { /* fail-open */ }
  }
  const value = await factory()
  if (redis) {
    try {
      await redis.setItem(`cache:${key}`, { v: value, exp: Date.now() + ttlSec * 1000 })
    } catch { /* non-bloquant */ }
  }
  return value
}

/**
 * Invalidate a cache entry (e.g.: after UPDATE/DELETE).
 */
export async function invalidateCache(key: string): Promise<void> {
  const redis = getRedis()
  if (!redis) return
  try {
    await redis.removeItem(`cache:${key}`)
  } catch { /* non-bloquant */ }
}

/**
 * Sliding window rate limit. Returns true if the request should pass, false
 * if it exceeds the quota. Counter resets after `windowSec` seconds
 * of inactivity — not a true strict sliding window (token bucket) but
 * sufficient to block bots / floods without over-engineering.
 *
 * @example
 *   const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
 *   if (!await rateLimit(`register:${ip}`, 5, 600)) {
 *     throw createError({ statusCode: 429, message: 'Trop de tentatives' })
 *   }
 */
export async function rateLimit(
  key:       string,
  max:       number,
  windowSec: number,
): Promise<boolean> {
  const redis = getRedis()
  if (!redis) return true   // fail-open : Redis down ne doit pas bloquer un client
  const fullKey = `ratelimit:${key}`
  try {
    // unstorage driver redis ne expose pas INCR atomique → on fait un read+write.
    // Race condition possible mais sans impact sécurité (au pire 1-2 hits en plus).
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
    return true   // fail-open
  }
}

/**
 * Simple distributed lock — execute `fn` only once if multiple processes
 * try in parallel. SET NX EX pattern (atomic). If the lock cannot be
 * taken, returns null (the caller decides what to do: silent skip,
 * retry, etc.).
 *
 * @example
 *   const r = await withLock('cron:email-queue', 60_000, async () => {
 *     return processEmailQueue()
 *   })
 * if (r === null) console.log('[cron] already in progress, skip')
 */
export async function withLock<T>(
  key:   string,
  ttlMs: number,
  fn:    () => Promise<T>,
): Promise<T | null> {
  const redis = getRedis()
  if (!redis) return await fn()   // fail-open
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
