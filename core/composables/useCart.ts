

export interface CartItem {
  id: number
  name: string
  price: string
  priceRaw: number
  quantity: number
  image?: string
  ref?: string
}

export function useCart() {
  const cart = useState<CartItem[]>('shop-cart', () => [])

  
  if (import.meta.client) {
    const saved = localStorage.getItem('shop-cart')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length && !cart.value.length) {
          cart.value = parsed
        }
      } catch {  }
    }

    
    watch(cart, (val) => {
      localStorage.setItem('shop-cart', JSON.stringify(val))
    }, { deep: true })
  }

  function addToCart(product: { id: number; name: string; price: string; priceRaw: number; image?: string; ref?: string }, qty = 1) {
    const existing = cart.value.find(i => i.id === product.id)
    if (existing) {
      existing.quantity += qty
    } else {
      cart.value.push({ ...product, quantity: qty })
    }
  }

  function removeFromCart(id: number) {
    cart.value = cart.value.filter(i => i.id !== id)
  }

  function updateQuantity(id: number, qty: number) {
    if (qty <= 0) return removeFromCart(id)
    const item = cart.value.find(i => i.id === id)
    if (item) item.quantity = qty
  }

  function clearCart() {
    cart.value = []
  }

  const totalHT = computed(() =>
    cart.value.reduce((sum, item) => sum + item.priceRaw * item.quantity, 0)
  )

  const totalItems = computed(() =>
    cart.value.reduce((sum, item) => sum + item.quantity, 0)
  )

  const totalFormatted = computed(() =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(totalHT.value)
  )

  return { cart, addToCart, removeFromCart, updateQuantity, clearCart, totalHT, totalItems, totalFormatted }
}
