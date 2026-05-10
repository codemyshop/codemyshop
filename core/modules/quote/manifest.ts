/**
 *
 * Quote module manifest (B2B billing quotations).
 * Not to be confused with quoterequest (prospect form).
 */
import type { ModuleManifest } from '../../server/db/schema-pg/module-registry'

export const acQuoteManifest: ModuleManifest = {
  routes: {},
  hooks: [],
  deps: ['drizzle-orm', 'mysql2'],
  tables: ['cs_quote', 'cs_quote_line'],
}
