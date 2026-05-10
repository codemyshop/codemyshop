/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * SSR-only plugin: pre-loads native PS flags (`ps_configuration`) during rendering
 * initially so that `useB2bVisibility()` / `useCatalogMode()` / etc. are
 * synchronous on the client side without re-fetching.
 *
 * Flags whitelist : PS_B2B_ENABLE, PS_CATALOG_MODE, PS_GUEST_CHECKOUT_ENABLED.
 *
 * Source of truth: `ps_configuration` (the current tenant's PS database). Any
 * modification via `/hub/informations` is reflected at the next SSR refresh
 * (60s cache on the endpoint).
 *
 * Fallback: if the endpoint is unresponsive, flags set to '0' — safe behavior by
 * default (B2C, active cart, guest checkout off).
 */
export default defineNuxtPlugin(async () => {
  try {
    const res = await $fetch<{ flags: Record<string, string> }>('/api/configuration/flags-public')
    useState('ps_flags', () => res?.flags ?? {})
  } catch {
    useState('ps_flags', () => ({}))
  }
})
