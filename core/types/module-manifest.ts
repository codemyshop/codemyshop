/**
 * Canonical format of a module manifest.
 *
 * Each module (core/modules/<X>/, enterprise/<pack>/<X>/, internal/<X>/)
 * defines its `manifest.ts` in the format below. The runtime module loader
 * scans all manifests at boot and registers the hooks according to the edition
 * compatible with the current tenant's tier.
 *
 * PrestaShop hooks pattern adapted to Nuxt 4 + TS — open-source workstream
 * Phase 1 (2026-05-10).
 */

export type ModuleEdition = 'community' | 'enterprise' | 'custom' | 'internal'

export type ModulePack =
  | 'base'              // productivité opérationnelle
  | 'ai'                // brand DNA, content queue, cover gen
  | 'data'              // telemetry, depgraph, veille
  | 'seo'               // GSC console
  | 'banking'           // bank, urssaf
  | 'vertical-food'     // lot, expiry, catchweight, product-food
  | 'vertical-vape'
  | 'vertical-fashion'
  | 'vertical-jewelry'
  | 'misc'              // translate, pricing, ab-testing, builder, leadqual

export type Tier = 'community' | 'starter' | 'growth' | 'pro' | 'custom'

/** Hooks consommés par le module (s'abonne) ou exposés (slot). */
export interface ModuleHooks {
  /** Vue display slots exposed by this module (consumable by other modules). */
  exposes?: string[]
  /** Consumed hooks: action* (server EventBus), display* (UI slot), filter* (transform). */
  consumes?: string[]
}

/** Module pricing — base tier + optional pay-per-feature add-on. */
export interface ModulePricing {
  /** Commercial tiers that include the module at no additional cost. */
  included_in_tiers: Tier[]
  /** If present, the module is also purchasable as an add-on on top of any tier. */
  addon?: {
    stripe_price_id: string
    monthly_eur: number
    label: string
  }
}

export interface ModuleManifest {
  /** Unique module identifier (kebab-case). Ex: 'lead-capa', 'cs-payment'. */
  id: string

  /** Technical edition = where the code is physically located. */
  edition: ModuleEdition

  /** Pack (only for edition='enterprise'). */
  pack?: ModulePack

  /** Required modules for operation. Blocks activation if absent. */
  requires?: string[]

  /** Exposed and consumed hooks. */
  hooks?: ModuleHooks

  /** Pricing (only for edition='enterprise'/'custom'). */
  pricing?: ModulePricing

  /** Installation hook — called once during tenant provisioning. */
  install?: (ctx: ModuleContext) => Promise<void>

  /** Uninstallation hook — called during cleanup. */
  uninstall?: (ctx: ModuleContext) => Promise<void>
}

/** Context provided to modules at install/uninstall and to hook handlers. */
export interface ModuleContext {
  tenantId: string
  tier: Tier
  edition: ModuleEdition
}

/** Type-safe auto-completion helper for defining a manifest. */
export function defineModule(m: ModuleManifest): ModuleManifest {
  return m
}
