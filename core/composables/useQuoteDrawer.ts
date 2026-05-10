/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * Shared state for the quote drawer opening (QuoteDrawer.vue).
 * Same pattern as useCartDrawer.
 */
export function useQuoteDrawer() {
  const isOpen = useState<boolean>('quote-drawer-open', () => false)

  function open() { isOpen.value = true }
  function close() { isOpen.value = false }
  function toggle() { isOpen.value = !isOpen.value }

  return { isOpen, open, close, toggle }
}
