

export interface WishlistSummary {
  id_wishlist: number
  name: string
  is_default: boolean
  item_count: number
  share_token: string | null
  date_add: string
  date_upd: string
}

export interface WishlistItem {
  id_wishlist_product: number
  id_product: number
  id_product_attribute: number
  quantity: number
  priority: number
  product_name: string
  link_rewrite: string
  base_price: number
  reference: string
  active: boolean
  id_image: number | null
}

function ssrHeaders(): Record<string, string> {
  if (!import.meta.server) return {}
  const h = useRequestHeaders(['cookie'])
  return h.cookie ? { cookie: h.cookie } : {}
}

export function useWishlist() {
  const lists = useState<WishlistSummary[]>('wishlist-lists', () => [])
  const loaded = useState<boolean>('wishlist-loaded', () => false)
  const loading = useState<boolean>('wishlist-loading', () => false)
  const itemTotal = computed(() => lists.value.reduce((s, l) => s + l.item_count, 0))
  const defaultList = computed(() => lists.value.find(l => l.is_default) || lists.value[0] || null)

  async function loadLists(): Promise<void> {
    loading.value = true
    try {
      const res = await $fetch<{ success: boolean; lists: WishlistSummary[]; item_total?: number }>(
        '/api/wishlist/lists',
        { headers: ssrHeaders() },
      )
      lists.value = res.lists || []
      loaded.value = true
    } catch (err: any) {
      if (err?.statusCode === 401) {
        lists.value = []
        loaded.value = true
      } else {
        console.warn('[useWishlist] loadLists failed', err?.message || err)
      }
    } finally {
      loading.value = false
    }
  }

  async function createList(name: string): Promise<WishlistSummary | null> {
    const res = await $fetch<{ success: boolean; id_wishlist: number; name: string; is_default: boolean }>(
      '/api/wishlist/lists',
      { method: 'POST', body: { name }, headers: ssrHeaders() },
    )
    if (!res.success) return null
    await loadLists()
    return lists.value.find(l => l.id_wishlist === res.id_wishlist) || null
  }

  async function renameList(id: number, name: string): Promise<void> {
    await $fetch(`/api/wishlist/lists/${id}`, { method: 'PUT', body: { name }, headers: ssrHeaders() })
    await loadLists()
  }

  async function setDefault(id: number): Promise<void> {
    await $fetch(`/api/wishlist/lists/${id}`, { method: 'PUT', body: { is_default: true }, headers: ssrHeaders() })
    await loadLists()
  }

  async function deleteList(id: number): Promise<void> {
    await $fetch(`/api/wishlist/lists/${id}`, { method: 'DELETE', headers: ssrHeaders() })
    await loadLists()
  }

  async function fetchItems(idWishlist: number): Promise<WishlistItem[]> {
    const res = await $fetch<{ success: boolean; items: WishlistItem[] }>(
      `/api/wishlist/lists/${idWishlist}/items`,
      { headers: ssrHeaders() },
    )
    return res.items || []
  }

  async function addItem(
    idWishlist: number,
    idProduct: number,
    idAttr = 0,
    quantity = 1,
  ): Promise<{ added: boolean; incremented?: boolean }> {
    const res = await $fetch<{ success: boolean; added: boolean; incremented?: boolean }>(
      `/api/wishlist/lists/${idWishlist}/items`,
      {
        method: 'POST',
        body: { id_product: idProduct, id_product_attribute: idAttr, quantity },
        headers: ssrHeaders(),
      },
    )
    await loadLists()
    return res
  }

  async function removeItem(idWishlist: number, idProduct: number, idAttr = 0): Promise<void> {
    await $fetch(`/api/wishlist/lists/${idWishlist}/items`, {
      method: 'DELETE',
      query: { id_product: idProduct, id_product_attribute: idAttr },
      headers: ssrHeaders(),
    })
    await loadLists()
  }

  async function sendByEmail(idWishlist: number, to: string, message = ''): Promise<boolean> {
    const res = await $fetch<{ success: boolean; mail_sent: boolean }>(
      `/api/wishlist/lists/${idWishlist}/email`,
      { method: 'POST', body: { to, message }, headers: ssrHeaders() },
    )
    return !!res?.mail_sent
  }

  

  async function quickAdd(idProduct: number, idAttr = 0, quantity = 1): Promise<number | null> {
    if (!loaded.value) await loadLists()
    let target = defaultList.value
    if (!target) {
      target = await createList('Ma liste')
      if (!target) return null
    }
    await addItem(target.id_wishlist, idProduct, idAttr, quantity)
    return target.id_wishlist
  }

  return {
    lists,
    loaded,
    loading,
    itemTotal,
    defaultList,
    loadLists,
    createList,
    renameList,
    setDefault,
    deleteList,
    fetchItems,
    addItem,
    removeItem,
    sendByEmail,
    quickAdd,
  }
}
