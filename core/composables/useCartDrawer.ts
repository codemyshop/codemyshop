

export function useCartDrawer() {
  const isOpen = useState<boolean>('cart-drawer-open', () => false)

  function open() { isOpen.value = true }
  function close() { isOpen.value = false }
  function toggle() { isOpen.value = !isOpen.value }

  return { isOpen, open, close, toggle }
}
