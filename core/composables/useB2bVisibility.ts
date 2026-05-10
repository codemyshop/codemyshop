/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * Controls price visibility on B2B tenants.
 * Source of truth: PS_B2B_ENABLE in ps_configuration (native PS DB).
 *
 * Preloaded at SSR by the ps-flags.server.ts plugin in useState('ps_flags').
 * Switch via /hub/informations → UPDATE ps_configuration → refresh SSR suivant.
 *
 * Temporary fallback: if the DB flag is not defined, we fall back to the
 * hardcoded runtimeConfig.public.b2bMode (legacy before DB-first migration).
 *
 * showPrices rule:
 * - Non-B2B (PS_B2B_ENABLE=0): prices always visible
 * - B2B (PS_B2B_ENABLE=1): prices + cart visible if customer is logged in.
 * A staff employee logged in does NOT unlock prices/cart — they are
 * a visitor on the front-end (admin via /hub/*). Avoids confusion from a
 * cart/prices appearing just because the admin is logged into the back office.
 */
export function useB2bVisibility() {
  const { public: publicCfg } = useRuntimeConfig()
  const customerAuth = useCustomerAuth()
  const psFlags = useState<Record<string, string>>('ps_flags', () => ({}))

  const isB2b = computed(() => {
    const dbFlag = psFlags.value?.PS_B2B_ENABLE
    if (dbFlag === '1') return true
    if (dbFlag === '0') return false
    // Fallback legacy : hardcode b2bMode runtimeConfig
    return publicCfg.b2bMode === true
  })

  const isCatalogMode = computed(() => psFlags.value?.PS_CATALOG_MODE === '1')

  // Prix visibles si : non-B2B OU customer connecté (employee ignoré).
  const showPrices = computed(() => !isB2b.value || customerAuth.loggedIn.value)

  return { showPrices, isB2b, isCatalogMode, loggedIn: customerAuth.loggedIn }
}
