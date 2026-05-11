

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
