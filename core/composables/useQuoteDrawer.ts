

export function useQuoteDrawer() {
  const isOpen = useState<boolean>('quote-drawer-open', () => false)

  function open() { isOpen.value = true }
  function close() { isOpen.value = false }
  function toggle() { isOpen.value = !isOpen.value }

  return { isOpen, open, close, toggle }
}
