/**
 *
 * PostgreSQL advisory lock for multi-instance singleton — equivalent of the pattern
 * Python `ac_logger.AutomateLog` on the distributed side: guarantees that only one
 * instance of a Nitro automation runs at any given time T, even if Nitro
 * starts 2+ workers or if the scheduler triggers a concurrent ticker.
 *
 * Implemented via pg_try_advisory_lock(bigint) — the bigint is derived from
 * key_name de l'automate (hash 63 bits stable).
 */

import { getPgClient } from '~/server/utils/db-pg-adapter'

function hashKeyToBigInt(key: string): bigint {
  let h = 1469598103934665603n
  for (let i = 0; i < key.length; i++) {
    h ^= BigInt(key.charCodeAt(i))
    h = (h * 1099511628211n) & 0x7fffffffffffffffn
  }
  return h
}

export async function withAutomateLock<T>(
  key: string,
  fn: () => Promise<T>,
): Promise<{ acquired: true; result: T } | { acquired: false; result: null }> {
  const sql = getPgClient()
  const lockId = hashKeyToBigInt(key)
  const [{ acquired }] = await sql<{ acquired: boolean }[]>`
    SELECT pg_try_advisory_lock(${lockId}::bigint) AS acquired
  `
  if (!acquired) {
    return { acquired: false, result: null }
  }
  try {
    const result = await fn()
    return { acquired: true, result }
  } finally {
    await sql`SELECT pg_advisory_unlock(${lockId}::bigint)`
  }
}
