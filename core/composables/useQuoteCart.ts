/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * Panier de devis B2B — localStorage uniquement.
 * For unauthenticated visitors on B2B tenants (Example Shop).
 * No price stored (the visitor doesn't see prices).
 */

export interface QuoteItem {
  id: number
  name: string
  reference?: string
  image?: string
  quantity: number
}

export function useQuoteCart() {
  const { public: publicCfg } = useRuntimeConfig()
  const storageKey = `${(publicCfg.clientId as string) || 'default'}-quote`
  const items = useState<QuoteItem[]>('quote-cart', () => [])

  // Restore from localStorage on client
  if (import.meta.client) {
    const saved = localStorage.getItem(storageKey)
    if (saved && !items.value.length) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) items.value = parsed
      } catch { /* ignore */ }
    }
    watch(items, (val) => {
      localStorage.setItem(storageKey, JSON.stringify(val))
    }, { deep: true })
  }

  const totalItems = computed(() =>
    items.value.reduce((sum, i) => sum + i.quantity, 0),
  )

  function addToQuote(product: { id: number; name: string; reference?: string; image?: string }, qty = 1) {
    const existing = items.value.find(i => i.id === product.id)
    if (existing) {
      existing.quantity += qty
    } else {
      items.value.push({ ...product, quantity: qty })
    }
  }

  function updateQuantity(productId: number, qty: number) {
    if (qty <= 0) {
      items.value = items.value.filter(i => i.id !== productId)
    } else {
      const item = items.value.find(i => i.id === productId)
      if (item) item.quantity = qty
    }
  }

  function removeFromQuote(productId: number) {
    items.value = items.value.filter(i => i.id !== productId)
  }

  function clearQuote() {
    items.value = []
    if (import.meta.client) {
      localStorage.removeItem(storageKey)
    }
  }

  return {
    items,
    totalItems,
    addToQuote,
    updateQuantity,
    removeFromQuote,
    clearQuote,
  }
}
