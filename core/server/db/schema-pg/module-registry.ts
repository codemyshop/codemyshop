/**
 *
 * Drizzle PG schema for module registry — task #44
 * port-drizzle-mariadb-pg P1 step 1.
 *
 * Source of truth for runtime (PS / Nuxt) per module and per tenant. The table
 * lives in the tenant DB — on the PG side, schema `cs_main`. The VPS
 * Example Shop v2 / secondary v2 systems retain their table on their local MariaDB and
 * query the MariaDB branch of the facade (PG_ENABLED_DOMAINS not set).
 *
 * Type mapping MariaDB -> PG (parity with Phase C dump):
 *   - INT UNSIGNED AUTO_INCREMENT  -> serial
 *   - ENUM('ps','nuxt')            -> varchar(4) + $type<Runtime>
 *   - ENUM('active'…'deprecated')  -> varchar(10) + $type<ModuleStatus>
 *   - LONGTEXT manifest_json       -> text + $type<ModuleManifest | null>
 *   - DATETIME                     -> timestamp(0) without time zone
 */

import { index, integer, pgSchema, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export type Runtime = 'ps' | 'nuxt'
export type ModuleStatus = 'active' | 'disabled' | 'deprecated'

export interface ModuleManifest {
  routes?: {
    admin?: string[]
    public?: string[]
    api?: string[]
  }
  hooks?: string[]
  deps?: string[]
  tables?: string[]
}

export const moduleRegistryVaisseau = vaisseauMereAcSchema.table(
  'cs_module_registry',
  {
    idModuleRegistry: serial('id_module_registry').primaryKey(),
    codename: varchar('codename', { length: 128 }).notNull().unique(),
    version: varchar('version', { length: 32 }).notNull(),
    runtime: varchar('runtime', { length: 4 }).$type<Runtime>().notNull().default('ps'),
    status: varchar('status', { length: 10 }).$type<ModuleStatus>().notNull().default('active'),
    schemaHash: varchar('schema_hash', { length: 64 }),
    manifestJson: text('manifest_json').$type<ModuleManifest | null>(),
    lastMigratedAt: timestamp('last_migrated_at', { mode: 'date', precision: 0 }),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull().defaultNow(),
    dateUpd: timestamp('date_upd', { mode: 'date', precision: 0 }).notNull().defaultNow(),
  },
  (t) => ({
    kRuntimeStatus: index('idx_runtime_status').on(t.runtime, t.status),
  }),
)

export type ModuleRegistryPgRow = typeof moduleRegistryVaisseau.$inferSelect
export type ModuleRegistryPgInsert = typeof moduleRegistryVaisseau.$inferInsert
