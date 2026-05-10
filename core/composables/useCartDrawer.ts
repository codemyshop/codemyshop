/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * Shared state for slide-in cart drawer open status (CartDrawer.vue).
 * Used by the header button to open, by the drawer to close,
 * and by product/catalog pages to open after "Add to cart".
 */
export function useCartDrawer() {
  const isOpen = useState<boolean>('cart-drawer-open', () => false)

  function open() { isOpen.value = true }
  function close() { isOpen.value = false }
  function toggle() { isOpen.value = !isOpen.value }

  return { isOpen, open, close, toggle }
}
