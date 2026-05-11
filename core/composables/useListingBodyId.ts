

import type { MaybeRefOrGetter } from 'vue'

export type ListingKind =
  | 'category'
  | 'manufacturer'
  | 'product'
  | 'cms'
  | 'cms-category'
  | 'new-products'
  | 'prices-drop'
  | 'best-sales'
  | 'search'

export function useListingBodyId(
  kind: MaybeRefOrGetter<ListingKind>,
  id?: MaybeRefOrGetter<number | null | undefined>,
) {
  useHead(() => {
    const k = toValue(kind)
    const i = id !== undefined ? toValue(id) : null

    
    if ((k === 'category' || k === 'manufacturer' || k === 'product' || k === 'cms' || k === 'cms-category') && !i) return {}

    let domId = ''
    let classes = ''
    switch (k) {
      case 'category':
        domId = `category-${i}`
        classes = `category category-${i}`
        break
      case 'manufacturer':
        domId = `manufacturer-${i}`
        classes = `page-manufacturer manufacturer-${i}`
        break
      case 'product':
        domId = `product-${i}`
        classes = `product product-id-${i}`
        break
      case 'cms':
        domId = `cms-${i}`
        classes = `cms cms-id-${i}`
        break
      case 'cms-category':
        domId = `cms-category-${i}`
        classes = `cms-category cms-category-${i}`
        break
      case 'new-products':
        domId = 'new-products'
        classes = 'page-new-products'
        break
      case 'prices-drop':
        domId = 'prices-drop'
        classes = 'page-prices-drop'
        break
      case 'best-sales':
        domId = 'best-sales'
        classes = 'page-best-sales'
        break
      case 'search':
        domId = 'search'
        classes = 'page-search'
        break
    }

    return { bodyAttrs: { id: domId, class: classes } }
  })
}

export function useCategoryBodyId(idCategory: MaybeRefOrGetter<number | null | undefined>) {
  return useListingBodyId('category', idCategory)
}
