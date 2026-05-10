/**
 * Module loader runtime — scans manifests, filters by compatible edition
 * with the tenant tier, registers hooks (action / filter / display).
 *
 * PrestaShop hooks pattern adapted for Nuxt 4 — codemyshop-oss project Phase 1.2
 * (2026-05-10).
 *
 * Discovery via Vite import.meta.glob :
 *   - core/modules/<X>/manifest.ts                      (community)
 *   - enterprise/<pack>/<X>/manifest.ts                 (enterprise)
 * - internal/<X>/manifest.ts                          (internal — absent on the OSS side)
 *
 * On the public OSS repo, internal/+enterprise/ don't exist → the globs
 * return {} silently, the loader works with community only.
 */
import type { ModuleManifest, Tier, ModuleEdition } from '~/types/module-manifest'

// === Discovery via Vite glob ===========================================
// `eager: true` charge les modules au build (pas de dynamic import runtime).
// Sur le repo public OSS, internal/+enterprise/ n'existent pas physiquement,
// les globs retournent {} sans erreur — élégant pour la double-distribution.
// Patterns relatifs au fichier (core/server/utils/) — Nitro/Vite résout au
// build, pas au runtime. Les patterns absolus en `/...` ne sont PAS résolus
// côté server bundle et laissent un appel `globalThis._importMeta_.glob` qui
// crash au boot Nitro (incident deploy preprod 2026-05-10). Doctrine :
// toujours pattern relatif `../...` côté server.
const communityGlobs = import.meta.glob<{ default: ModuleManifest }>(
  '../../modules/*/manifest.ts',
  { eager: true },
)
const enterpriseGlobs = import.meta.glob<{ default: ModuleManifest }>(
  '../../../enterprise/*/*/manifest.ts',
  { eager: true },
)
const internalGlobs = import.meta.glob<{ default: ModuleManifest }>(
  '../../../internal/*/manifest.ts',
  { eager: true },
)

function flatten(globs: Record<string, { default: ModuleManifest }>): ModuleManifest[] {
  return Object.values(globs)
    .map((m) => m.default)
    .filter((m): m is ModuleManifest => Boolean(m && m.id))
}

const ALL_MANIFESTS: ModuleManifest[] = [
  ...flatten(communityGlobs),
  ...flatten(enterpriseGlobs),
  ...flatten(internalGlobs),
]

// === Tier ordering for inclusion checks ===============================
const TIER_ORDER: Record<Tier, number> = {
  community: 0,
  starter:   1,
  growth:    2,
  pro:       3,
  custom:    4,
}

// === Filtering =========================================================

export interface TenantContext {
  tenantId: string
  tier: Tier
  /** Module identifiers (manifest.id) of modules enabled via marketplace add-ons. */
  marketplaceAddons?: string[]
  /** If true, allows 'internal' edition modules (= internal-only setup). */
  isInternalTenant?: boolean
}

/**
 * Determines whether a given module is active for this tenant.
 *
 * - community  → always active.
 * - enterprise → active if tier ∈ pricing.included_in_tiers OR add-on purchase.
 * - custom     → active only for tier='custom' OR explicit add-on purchase.
 * - internal   → active only if isInternalTenant=true (internal setup).
 */
export function isModuleActive(m: ModuleManifest, ctx: TenantContext): boolean {
  if (m.edition === 'community') return true
  if (m.edition === 'internal')  return Boolean(ctx.isInternalTenant)
  if (m.edition === 'custom')    return ctx.tier === 'custom' || (ctx.marketplaceAddons?.includes(m.id) ?? false)
  // enterprise
  const includedTiers = m.pricing?.included_in_tiers ?? []
  if (includedTiers.includes(ctx.tier)) return true
  if (ctx.marketplaceAddons?.includes(m.id)) return true
  return false
}

/**
 * Lists active modules for the current tenant. Also resolves
 * dependencies (`requires`) — a module is active only if all its
 * `requires` are as well.
 */
export function loadModulesForTenant(ctx: TenantContext): ModuleManifest[] {
  const active = ALL_MANIFESTS.filter((m) => isModuleActive(m, ctx))
  const activeIds = new Set(active.map((m) => m.id))

  // Filter out modules whose `requires` are missing
  const resolved = active.filter((m) => {
    if (!m.requires || m.requires.length === 0) return true
    const missing = m.requires.filter((req) => !activeIds.has(req))
    if (missing.length > 0) {
      console.warn(`[module-loader] '${m.id}' requires missing modules: ${missing.join(', ')} — skipped`)
      return false
    }
    return true
  })

  return resolved
}

/** Tous les manifests présents dans le build (pour debug + admin marketplace). */
export function listAllManifests(): ModuleManifest[] {
  return ALL_MANIFESTS.slice()
}

/** Manifests by edition (for marketplace stats). */
export function manifestsByEdition(): Record<ModuleEdition, ModuleManifest[]> {
  const out: Record<ModuleEdition, ModuleManifest[]> = {
    community: [], enterprise: [], custom: [], internal: [],
  }
  for (const m of ALL_MANIFESTS) out[m.edition].push(m)
  return out
}
