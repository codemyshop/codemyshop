/**
 *
 * App-level UPSERT helper for ps_configuration.
 *
 * The MariaDB → PG migration (task #44) did not restore the native unique index
 * PrestaShop on (name, id_shop_group, id_shop). Without this index, the syntax
 * `ON CONFLICT (name, id_shop_group, id_shop) DO UPDATE` fails. We emulate
 * the upsert in two steps: UPDATE first, INSERT if 0 rows affected.
 *
 * Not strictly atomic (race condition possible between UPDATE and INSERT) but
 * sufficient for single-user admin endpoints. Simplify to
 * `ON CONFLICT` native when the unique index is restored in a dedicated task
 * (postgres support + tenant propagation).
 *
 * Exclusive target: the global row (id_shop_group IS NULL, id_shop IS NULL),
 * which corresponds to the default single-shop configuration of PrestaShop.
 */

import type { PgAdapterClient } from './db-pg-adapter'

interface RunCapableDb {
  run: PgAdapterClient['run']
}

export async function upsertConfiguration(
  db: RunCapableDb,
  name: string,
  value: string,
): Promise<void> {
  const updated = await db.run(
    `UPDATE ps_configuration SET value = ?, date_upd = NOW()
     WHERE name = ? AND id_shop_group IS NULL AND id_shop IS NULL`,
    [value, name],
  )
  if (updated.affectedRows > 0) return

  await db.run(
    `INSERT INTO ps_configuration (name, value, date_add, date_upd)
     VALUES (?, ?, NOW(), NOW())`,
    [name, value],
  )
}
