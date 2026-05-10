/**
 *
 * CustomerExtra facade — 1:1 B2B extension of `ps_customer`.
 * Source of truth: `cs_main.cs_customer_extra`, owned by
 * ac_customerextra.
 *
 * Effort #38 — PostgreSQL migration: 100% PostgreSQL via `usePocPg()`. The fallback
 * MariaDB fallback is cut off at runtime (see CLAUDE.md DB-Only).
 *
 * Tolerates table absence on read (PostgreSQL error 42P01); on
 * write the caller returns 501 if necessary.
 */

import { sql } from 'drizzle-orm'
import { usePocPg } from '../../../../server/db/drizzle-pg'

interface CustomerExtraContext {
  // Conservé pour compat de signature avec les call-sites Nuxt existants.
  // En PG single-DB (ac_hub / cs_main) le contexte tenant est
  // inutile — on garde la forme pour ne pas casser les imports.
  event?: any
  clientId?: string
}

function isMissingTable(err: any): boolean {
  // PostgreSQL : undefined_table
  return err?.code === '42P01'
}

/**
 * Reads the activity_code of a customer (tolerant read: null if absent or
 * if the table doesn't exist).
 */
export async function getCustomerActivityCode(
  idCustomer: number,
  _ctx: CustomerExtraContext = {},
): Promise<string | null> {
  try {
    const rows = await usePocPg().execute<{ activity_code: string | null }>(sql`
      SELECT activity_code
        FROM cs_main.cs_customer_extra
       WHERE id_customer = ${idCustomer}
       LIMIT 1
    `)
    const list = rows as any[]
    return list[0]?.activity_code ?? null
  } catch (err: any) {
    if (isMissingTable(err)) return null
    throw err
  }
}

/**
 * UPSERT activity_code (ON CONFLICT DO UPDATE).
 * Throw if the table doesn't exist (the caller decides on 501).
 */
export async function upsertCustomerActivityCode(
  idCustomer: number,
  activityCode: string,
  _ctx: CustomerExtraContext = {},
): Promise<void> {
  await usePocPg().execute(sql`
    INSERT INTO cs_main.cs_customer_extra
      (id_customer, activity_code, date_add, date_upd)
    VALUES
      (${idCustomer}, ${activityCode}, NOW(), NOW())
    ON CONFLICT (id_customer) DO UPDATE
      SET activity_code = EXCLUDED.activity_code,
          date_upd = NOW()
  `)
}

/**
 * Graceful UPSERT: tolerates table absence (used by public register where
 * the customerExtra seed must never block registration).
 * Returns true if the upsert occurred, false if the table was absent.
 */
export async function upsertCustomerActivityCodeGraceful(
  idCustomer: number,
  activityCode: string,
  ctx: CustomerExtraContext = {},
): Promise<boolean> {
  try {
    await upsertCustomerActivityCode(idCustomer, activityCode, ctx)
    return true
  } catch (err: any) {
    if (isMissingTable(err)) return false
    throw err
  }
}

/**
 * Not photo UPSERT — linkedin_url UPSERT only for a customer (used
 * by the LinkedIn modal of /hub/leads on rows where source = customer-noorder).
 * empty `url` → store NULL to erase the "verified" badge.
 */
export async function setCustomerLinkedinUrl(
  idCustomer: number,
  url: string | null,
  _ctx: CustomerExtraContext = {},
): Promise<void> {
  await usePocPg().execute(sql`
    INSERT INTO cs_main.cs_customer_extra
      (id_customer, linkedin_url, date_add, date_upd)
    VALUES (${idCustomer}, ${url}, NOW(), NOW())
    ON CONFLICT (id_customer) DO UPDATE
      SET linkedin_url = EXCLUDED.linkedin_url,
          date_upd     = NOW()
  `)
}

/**
 * Deletes the customerExtra row for a given customer.
 * Throw if the table doesn't exist.
 */
export async function deleteCustomerExtra(
  idCustomer: number,
  _ctx: CustomerExtraContext = {},
): Promise<void> {
  await usePocPg().execute(sql`
    DELETE FROM cs_main.cs_customer_extra
     WHERE id_customer = ${idCustomer}
  `)
}
