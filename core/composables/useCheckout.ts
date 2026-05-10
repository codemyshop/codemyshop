/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * Composable for the checkout flow.
 * Orchestrates 4 steps: Auth → Address → Shipping → Payment → Confirmation
 */

import type { AddressData, CarrierData, OrderData } from '~/server/connectors/base'

export type CheckoutStep = 'auth' | 'address' | 'shipping' | 'payment' | 'confirmation'

export function useCheckout(clientId?: string) {
  const step = useState<CheckoutStep>('checkout-step', () => 'auth')
  const loading = useState<boolean>('checkout-loading', () => false)
  const error = useState<string>('checkout-error', () => '')

  // Data collected during checkout
  const addresses = useState<AddressData[]>('checkout-addresses', () => [])
  const selectedAddressId = useState<number | null>('checkout-address-id', () => null)
  const carriers = useState<CarrierData[]>('checkout-carriers', () => [])
  const selectedCarrierId = useState<number | null>('checkout-carrier-id', () => null)
  const paymentMethod = useState<string>('checkout-payment', () => 'bankwire')
  const createdOrder = useState<OrderData | null>('checkout-order', () => null)

  // Fetch customer addresses
  async function loadAddresses(customerId: number) {
    loading.value = true
    try {
      const data = await $fetch<AddressData[]>('/api/catalogue/customer/addresses', {
        query: { customerId, clientId },
      })
      addresses.value = data
      if (data.length) selectedAddressId.value = data[0].id!
    } catch (err: any) {
      error.value = 'Impossible de charger les adresses'
    } finally {
      loading.value = false
    }
  }

  // Create new address
  async function createAddress(data: Omit<AddressData, 'id'>) {
    loading.value = true
    error.value = ''
    try {
      const addr = await $fetch<AddressData>('/api/catalogue/customer/addresses', {
        method: 'POST',
        body: { ...data, clientId },
      })
      addresses.value.push(addr)
      selectedAddressId.value = addr.id!
      return addr
    } catch (err: any) {
      error.value = 'Impossible de créer l\'adresse'
      return null
    } finally {
      loading.value = false
    }
  }

  // Update existing address
  async function updateAddress(addressId: number, data: Partial<Omit<AddressData, 'id'>>) {
    loading.value = true
    error.value = ''
    try {
      const addr = await $fetch<AddressData>(`/api/catalogue/customer/addresses/${addressId}`, {
        method: 'PUT',
        body: { ...data, clientId },
      })
      const idx = addresses.value.findIndex(a => a.id === addressId)
      if (idx >= 0) addresses.value[idx] = addr
      return addr
    } catch {
      error.value = 'Impossible de modifier l\'adresse'
      return null
    } finally {
      loading.value = false
    }
  }

  // Delete (soft) address
  async function deleteAddress(addressId: number) {
    loading.value = true
    error.value = ''
    try {
      await $fetch(`/api/catalogue/customer/addresses/${addressId}`, { method: 'DELETE' })
      addresses.value = addresses.value.filter(a => a.id !== addressId)
      if (selectedAddressId.value === addressId) {
        selectedAddressId.value = addresses.value[0]?.id ?? null
      }
    } catch {
      error.value = 'Impossible de supprimer l\'adresse'
    } finally {
      loading.value = false
    }
  }

  // Fetch available carriers — prix résolu serveur depuis ps_delivery × range
  // (zone via addressId, range via totalHT/poids panier).
  async function loadCarriers(ctx: { addressId?: number; totalHT?: number; weight?: number } = {}) {
    loading.value = true
    try {
      const data = await $fetch<CarrierData[]>('/api/shipping/methods', {
        query: {
          clientId,
          ...(ctx.addressId ? { addressId: ctx.addressId } : {}),
          ...(ctx.totalHT != null ? { totalHT: ctx.totalHT } : {}),
          ...(ctx.weight != null ? { weight: ctx.weight } : {}),
        },
      })
      carriers.value = data.filter(c => c.active)
      if (carriers.value.length) selectedCarrierId.value = carriers.value[0].id
    } catch {
      error.value = 'Impossible de charger les transporteurs'
    } finally {
      loading.value = false
    }
  }

  // Create order
  async function placeOrder(cartId: number, customerId: number, customerEmail?: string) {
    if (!selectedAddressId.value || !selectedCarrierId.value) {
      error.value = 'Adresse et transporteur requis'
      return null
    }

    loading.value = true
    error.value = ''
    try {
      const paymentModuleMap: Record<string, string> = {
        bankwire: 'ps_wirepayment',
        stripe: 'stripe',
        systempay: 'ps_wirepayment', // module systempay non installé dans PS, on utilise wirepayment + paiement CB via redirect
      }

      const paymentLabelMap: Record<string, string> = {
        bankwire: 'Virement bancaire',
        stripe: 'Carte bancaire (Stripe)',
        systempay: 'Carte bancaire (SystemPay)',
      }

      const order = await $fetch<OrderData>('/api/orders/create', {
        method: 'POST',
        body: {
          cartId,
          customerId,
          addressDeliveryId: selectedAddressId.value,
          addressInvoiceId: selectedAddressId.value,
          carrierId: selectedCarrierId.value,
          paymentMethod: paymentLabelMap[paymentMethod.value] || 'Virement bancaire',
          paymentModule: paymentModuleMap[paymentMethod.value] || 'ps_wirepayment',
          clientId,
          customerEmail,
        },
      })

      createdOrder.value = order
      step.value = 'confirmation'
      return order
    } catch (err: any) {
      error.value = err?.data?.message || 'Erreur lors de la création de la commande'
      return null
    } finally {
      loading.value = false
    }
  }

  function goToStep(s: CheckoutStep) {
    error.value = ''
    step.value = s
  }

  function reset() {
    step.value = 'auth'
    addresses.value = []
    selectedAddressId.value = null
    carriers.value = []
    selectedCarrierId.value = null
    paymentMethod.value = 'bankwire'
    createdOrder.value = null
    error.value = ''
  }

  const selectedCarrier = computed<CarrierData | null>(() =>
    carriers.value.find(c => c.id === selectedCarrierId.value) ?? null,
  )
  const shippingPrice = computed<number>(() => Number(selectedCarrier.value?.price ?? 0))

  return {
    step, loading, error,
    addresses, selectedAddressId,
    carriers, selectedCarrierId, selectedCarrier, shippingPrice,
    paymentMethod, createdOrder,
    loadAddresses, createAddress, updateAddress, deleteAddress,
    loadCarriers, placeOrder,
    goToStep, reset,
  }
}
