

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
