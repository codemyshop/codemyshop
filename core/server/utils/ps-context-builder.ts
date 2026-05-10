/**
 *
 * PrestaShop context aggregator.
 * Queries the tenant's PS Webservice to extract anonymized metrics.
 * SECURITY.md R3: no PII — only statistical aggregates.
 */

export interface ClientContext {
  clientId:        string
  clientName:      string
  totalProducts:   number
  totalCategories: number
  avgPrice:        number
  avgPriceFormatted: string
  priceRange:      { min: number; max: number }
  topCategories:   string[]
  businessType:    string       // 'B2B' | 'B2C' | 'Mixte'
  catalogStrength: string       // 'Petit' | 'Moyen' | 'Large'
  fetchedAt:       string
}

/**
 * Builds the tenant context from its PS API.
 * Does not expose ANY personal data (R3 least privilege).
 */
export async function buildClientContext(clientId: string): Promise<ClientContext> {
  const clientName = getClientDisplayName(clientId)

  try {
    // 1. Compter les produits
    const productsData = await psApiFetch<{ products?: any[] }>('products', {
      'filter[active]': '[1]',
      display: '[id,price,id_category_default]',
      limit: 500,
    }, clientId)

    const products = productsData?.products ?? []
    const totalProducts = products.length

    // 2. Compter les catégories
    const catsData = await psApiFetch<{ categories?: any[] }>('categories', {
      'filter[active]': '[1]',
      display: '[id,name]',
      limit: 200,
    }, clientId)

    const cats = (catsData?.categories ?? []).filter((c: any) => Number(c.id) > 2)
    const totalCategories = cats.length

    // 3. Calculer le panier moyen et la fourchette de prix
    const prices = products
      .map((p: any) => Number(p.price || 0))
      .filter((p: number) => p > 0)

    const avgPrice = prices.length > 0
      ? prices.reduce((a: number, b: number) => a + b, 0) / prices.length
      : 0

    const minPrice = prices.length > 0 ? Math.min(...prices) : 0
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0

    // 4. Top catégories (par fréquence)
    const catCount: Record<string, number> = {}
    for (const p of products) {
      const catId = String(p.id_category_default)
      catCount[catId] = (catCount[catId] ?? 0) + 1
    }
    const topCatIds = Object.entries(catCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => id)

    const topCategories = topCatIds.map(id => {
      const cat = cats.find((c: any) => String(c.id) === id)
      return cat ? getLang(cat.name) : `Cat #${id}`
    })

    // 5. Déduire le type business
    const businessType = avgPrice > 50 ? 'B2B' : avgPrice > 15 ? 'Mixte' : 'B2C'
    const catalogStrength = totalProducts > 500 ? 'Large' : totalProducts > 100 ? 'Moyen' : 'Petit'

    return {
      clientId,
      clientName,
      totalProducts,
      totalCategories,
      avgPrice: Math.round(avgPrice * 100) / 100,
      avgPriceFormatted: new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(avgPrice),
      priceRange: { min: Math.round(minPrice * 100) / 100, max: Math.round(maxPrice * 100) / 100 },
      topCategories,
      businessType,
      catalogStrength,
      fetchedAt: new Date().toISOString(),
    }
  } catch (err: any) {
    console.error(`[ps-context-builder] Error for ${clientId}:`, err?.message || err)
    // Fallback contexte minimal
    return {
      clientId,
      clientName,
      totalProducts: 0,
      totalCategories: 0,
      avgPrice: 0,
      avgPriceFormatted: '0 \u20ac',
      priceRange: { min: 0, max: 0 },
      topCategories: [],
      businessType: 'Inconnu',
      catalogStrength: 'Inconnu',
      fetchedAt: new Date().toISOString(),
    }
  }
}

function getClientDisplayName(clientId: string): string {
  const names: Record<string, string> = {
    'ac-hub':       'CodeMyShop Hub',
    'example-shop':   'Example Shop',
    'example-vape': 'Example Vape',
    'codemyshop':   'CodeMyShop (Demo)',
  }
  return names[clientId] ?? clientId
}
