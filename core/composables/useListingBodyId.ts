/**
 *
 * useListingBodyId — sets the `<body>` attributes following the conventions
 * PrestaShop for ALL listing pages. Allows GTM scripts, themes
 * custom and third-party CSS that expect the native PS selector to
 * work directly on this Nuxt frontend.
 *
 * Conventions PS natives :
 *   kind='category', id=X        → #category-X        .category.category-X
 *   kind='manufacturer', id=X    → #manufacturer-X    .page-manufacturer.manufacturer-X
 *   kind='product', id=X         → #product-X         .product.product-id-X
 *   kind='cms', id=X             → #cms-X             .cms.cms-id-X
 *   kind='cms-category', id=X    → #cms-category-X    .cms-category.cms-category-X
 *   kind='new-products'          → #new-products      .page-new-products
 *   kind='prices-drop'           → #prices-drop       .page-prices-drop
 *   kind='best-sales'            → #best-sales        .page-best-sales
 *   kind='search'                → #search            .page-search
 *
 * Reactive: if arguments change (SPA navigation), body updates.
 * Silent fallback if kind='category'/'manufacturer' without id → no attributes
 * (clean DOM, no error).
 *
 * Usage :
 *   useListingBodyId('category', () => silo.value?.id_category ?? null)
 *   useListingBodyId('new-products')
 *   useListingBodyId('manufacturer', () => brand.value?.id_manufacturer)
 */

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

    // Kinds qui requièrent un id : aucun attr si id absent
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

/** Alias conservé pour backward-compat (anciennes pages qui l'importent). */
export function useCategoryBodyId(idCategory: MaybeRefOrGetter<number | null | undefined>) {
  return useListingBodyId('category', idCategory)
}
