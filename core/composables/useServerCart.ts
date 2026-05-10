/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * E-commerce cart synchronized with PrestaShop.
 * Replaces the localStorage cart with a server cart persisted in the PS database.
 *
 * Hybrid strategy:
 * - Unauthenticated visitor → localStorage (as before)
 * - Authenticated customer → PS server cart (sync DB)
 * - On login → migrate localStorage → server
 */

import type { CartData, CartItemData } from '~/server/connectors/base'

export interface LocalCartItem {
  id: number
  name: string
  price: string
  priceRaw: number
  quantity: number
  image?: string
  ref?: string
  // Snapshot des infos card produit pour le drawer/page panier (visiteur
  // hors-DB). Peuplé par ProductCard.quickCart() ; côté serveur ces champs
  // viennent du SQL `cart-db.getCartFromDb`.
  format?: string
  packaging?: string
  caliber?: string
  pricePerKgFormatted?: string
  taxRate?: number
  /** Snapshot promo : prix de base barré + label "-X%" si applicable. */
  priceFormattedBeforeDiscount?: string
  pricePerKgFormattedBeforeDiscount?: string
  reductionLabel?: string
  /** Suffixe court prix unitaire (HT/K, HT/L, HT/U) — DB-First. */
  unitLabel?: string
}

export function useServerCart(clientId?: string) {
  const resolvedClientId = clientId || useRuntimeConfig().public.clientId as string || 'default'
  const cartStorageKey = `${resolvedClientId}-cart`

  const cart = useState<CartData | null>('server-cart', () => null)
  const localCart = useState<LocalCartItem[]>('local-cart', () => [])
  const cartLoading = useState<boolean>('cart-loading', () => false)
  const cartId = useState<number | null>('cart-id', () => null)

  // Restore local cart from localStorage on client
  if (import.meta.client) {
    const saved = localStorage.getItem(cartStorageKey)
    if (saved && !localCart.value.length) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) localCart.value = parsed.filter((i: any) => i.id && typeof i.priceRaw === 'number')
      } catch { /* ignore */ }
    }
    watch(localCart, (val) => {
      localStorage.setItem(cartStorageKey, JSON.stringify(val))
    }, { deep: true })
  }

  const isServerMode = computed(() => !!cart.value && !!cartId.value)

  const fmtEur = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)

  const items = computed(() => {
    if (isServerMode.value && cart.value) {
      return cart.value.items.map(i => ({
        id: i.productId,
        name: i.name,
        price: fmtEur(i.priceHT),
        priceRaw: i.priceHT,
        quantity: i.quantity,
        image: i.image,
        ref: i.reference,
        combinationId: i.combinationId,
        format: i.format,
        packaging: i.packaging,
        caliber: i.caliber,
        pricePerKgFormatted: i.pricePerKgFormatted,
        taxRate: i.taxRate,
        priceFormattedBeforeDiscount: i.priceHTBeforeDiscount !== undefined
          ? fmtEur(i.priceHTBeforeDiscount)
          : undefined,
        pricePerKgFormattedBeforeDiscount: i.pricePerKgFormattedBeforeDiscount,
        reductionLabel: i.reductionLabel,
        unitLabel: i.unitLabel,
      }))
    }
    return localCart.value
  })

  // Subtotal BEFORE discount (sum of priceHT × qty). In local mode, identical
  // to total. In server mode, distinct from totalHT when a promo code is
  // applied.
  const subtotalHT = computed(() => {
    if (isServerMode.value && cart.value) return (cart.value as any).subtotalHT ?? cart.value.totalHT
    return localCart.value.reduce((sum, i) => sum + (i.priceRaw || 0) * i.quantity, 0)
  })

  const subtotalTTC = computed(() => {
    if (isServerMode.value && cart.value) return (cart.value as any).subtotalTTC ?? cart.value.totalTTC
    return subtotalHT.value * 1.20
  })

  const totalHT = computed(() => {
    if (isServerMode.value && cart.value) return cart.value.totalHT
    return subtotalHT.value
  })

  const totalTTC = computed(() => {
    if (isServerMode.value && cart.value) return cart.value.totalTTC
    return totalHT.value * 1.20 // Fallback 20% TVA
  })

  const totalItems = computed(() => {
    return items.value.reduce((sum, i) => sum + i.quantity, 0)
  })

  const subtotalFormatted    = computed(() => fmtEur(subtotalHT.value))
  const subtotalTTCFormatted = computed(() => fmtEur(subtotalTTC.value))
  const totalFormatted       = computed(() => fmtEur(totalHT.value))
  const totalTTCFormatted    = computed(() => fmtEur(totalTTC.value))

  // Init server cart for a logged-in customer:
  // 1. Try to reload the last existing cart with items
  // 2. If no existing cart, create a new one
  // 3. Migrate localStorage items to server cart
  async function initServerCart(customerId: number) {
    cartLoading.value = true
    try {
      // Try to restore previous server cart
      let serverCart = await $fetch<CartData | null>('/api/cart/last', {
        query: { customerId, clientId },
      })

      if (serverCart && serverCart.items.length > 0) {
        // Existing cart found — restore it
        cart.value = serverCart
        cartId.value = serverCart.id
      } else {
        // No existing cart — create a new one
        const data = await $fetch<CartData>('/api/cart/create', {
          method: 'POST',
          body: { customerId, clientId },
        })
        cart.value = data
        cartId.value = data.id
      }

      // Migrate local cart items to server (if any)
      if (localCart.value.length && cartId.value) {
        for (const item of localCart.value) {
          await $fetch<CartData>('/api/cart/add', {
            method: 'POST',
            body: { cartId: cartId.value, productId: item.id, quantity: item.quantity, clientId },
          })
        }
        // Refresh server cart after migration
        const refreshed = await $fetch<CartData>('/api/cart', {
          query: { cartId: cartId.value, clientId },
        })
        cart.value = refreshed
      }

      // Clear local cart after successful server init
      localCart.value = []
    } catch (err) {
      console.error('[useServerCart] initServerCart error:', err)
    } finally {
      cartLoading.value = false
    }
  }

  async function addToCart(
    product: {
      id: number; name: string; price: string; priceRaw: number;
      image?: string; ref?: string;
      format?: string; packaging?: string; caliber?: string;
      pricePerKgFormatted?: string; taxRate?: number;
      priceFormattedBeforeDiscount?: string;
      pricePerKgFormattedBeforeDiscount?: string;
      reductionLabel?: string;
      unitLabel?: string;
    },
    qty = 1,
  ) {
    if (isServerMode.value && cartId.value) {
      cartLoading.value = true
      try {
        const data = await $fetch<CartData>('/api/cart/add', {
          method: 'POST',
          body: { cartId: cartId.value, productId: product.id, quantity: qty, clientId },
        })
        cart.value = data
      } finally {
        cartLoading.value = false
      }
    } else {
      const existing = localCart.value.find(i => i.id === product.id)
      if (existing) {
        existing.quantity += qty
      } else {
        localCart.value.push({ ...product, quantity: qty })
      }
    }
  }

  async function updateQuantity(productId: number, qty: number) {
    if (isServerMode.value && cartId.value) {
      cartLoading.value = true
      try {
        const data = await $fetch<CartData>('/api/cart/update', {
          method: 'PUT',
          body: { cartId: cartId.value, productId, quantity: qty, clientId },
        })
        cart.value = data
      } finally {
        cartLoading.value = false
      }
    } else {
      if (qty <= 0) {
        localCart.value = localCart.value.filter(i => i.id !== productId)
      } else {
        const item = localCart.value.find(i => i.id === productId)
        if (item) item.quantity = qty
      }
    }
  }

  async function removeFromCart(productId: number) {
    if (isServerMode.value && cartId.value) {
      cartLoading.value = true
      try {
        await $fetch('/api/cart/remove', {
          method: 'DELETE',
          query: { cartId: cartId.value, productId, clientId },
        })
        // Refresh cart
        const data = await $fetch<CartData>('/api/cart', {
          query: { cartId: cartId.value, clientId },
        })
        cart.value = data
      } finally {
        cartLoading.value = false
      }
    } else {
      localCart.value = localCart.value.filter(i => i.id !== productId)
    }
  }

  function clearCart() {
    cart.value = null
    cartId.value = null
    localCart.value = []
    if (import.meta.client) {
      localStorage.removeItem(cartStorageKey)
    }
  }

  const discountCode = computed(() => cart.value?.discountCode ?? null)
  const discountHT = computed(() => cart.value?.discountHT ?? 0)

  async function applyPromoCode(code: string) {
    if (!isServerMode.value || !cartId.value) {
      throw new Error('Connexion requise pour utiliser un code promo')
    }
    const data = await $fetch<any>('/api/cart/coupon', {
      method: 'POST',
      body: { cartId: cartId.value, code, clientId },
    })
    cart.value = data
    return data
  }

  async function removePromoCode() {
    if (!isServerMode.value || !cartId.value) return
    const data = await $fetch<any>('/api/cart/coupon', {
      method: 'DELETE',
      body: { cartId: cartId.value, clientId },
    })
    cart.value = data
    return data
  }

  /**
   * Loads a specific cart (identified by id) rather than the "last cart"
   * of the customer. Used by the `/panier?recover=<id>` flow (abandoned cart recovery email CTA
   * — the user may have multiple carts
   * orphaned, we want to isolate the one being recovered.
   *
   * Security: we verify that the cart belongs to the authenticated customer
   * before loading it into state. Otherwise fall back to standard initServerCart.
   */
  async function loadCartById(targetCartId: number, customerId: number) {
    cartLoading.value = true
    try {
      const data = await $fetch<CartData>('/api/cart', {
        query: { cartId: targetCartId, clientId },
      })
      if (data && data.customerId === customerId) {
        cart.value = data
        cartId.value = data.id
        // Ne migre pas le localCart ici — l'objectif est de présenter
        // EXACTEMENT le panier relancé, pas de l'enrichir avec ce que
        // l'user avait peut-être commencé entre temps.
      } else {
        // Cart inexistant ou pas le bon customer → fallback init standard.
        await initServerCart(customerId)
      }
    } catch (err) {
      console.error('[useServerCart] loadCartById error:', err)
      await initServerCart(customerId)
    } finally {
      cartLoading.value = false
    }
  }

  // TVA Corse (2,1 % au lieu de 5,5 %) — détectée côté serveur via
  // postcode FR 20xxx. Sert au bandeau bleu sur /panier et /commander.
  const appliedCorseTva = computed<boolean>(
    () => Boolean(isServerMode.value && cart.value && (cart.value as any).appliedCorseTva),
  )
  const deliveryPostcode = computed<string>(
    () => String((cart.value as any)?.deliveryPostcode || ''),
  )

  return {
    cart, items, cartId, cartLoading,
    isServerMode,
    subtotalHT, subtotalTTC,
    totalHT, totalTTC, totalItems,
    subtotalFormatted, subtotalTTCFormatted,
    totalFormatted, totalTTCFormatted,
    discountCode, discountHT,
    appliedCorseTva, deliveryPostcode,
    addToCart, updateQuantity, removeFromCart, clearCart,
    initServerCart, loadCartById, applyPromoCode, removePromoCode,
  }
}
