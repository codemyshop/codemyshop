/**
 *
 * Robust connector for the PrestaShop REST webservice.
 * Supports multi-tenant: each client can have their own PrestaShop instance.
 *
 * Variables d'environnement :
 *   PRESTASHOP_API_KEY        — cl\u00e9 par d\u00e9faut (ac-hub)
 *   PS_API_KEY_EXAMPLE        — cl\u00e9 sp\u00e9cifique Example Shop
 *   PS_API_KEY_SMOKEVAPE      — cl\u00e9 sp\u00e9cifique SmokeVape
 *   PS_URL_EXAMPLE            — URL API Example Shop (ex: https://example-shop.com/api)
 *   PS_URL_SMOKEVAPE          — URL API SmokeVape
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CatalogProduct {
  id:       number
  name:     string
  ref:      string
  price:    string
  image?:   string
  badge?:   string
  active:   boolean
  description_short?: string
}

// ── R\u00e9solution multi-tenant ──────────────────────────────────────────────────────

interface PsCredentials {
  apiUrl: string
  apiKey: string
}

/**
 * Resolves PrestaShop credentials for a given client.
 * First looks for specific variables (PS_API_KEY_EXAMPLE),
 * then falls back to default variables.
 */
export function resolveCredentials(clientId?: string): PsCredentials {
  const config = useRuntimeConfig()
  const env = process.env

  // Recherche sp\u00e9cifique par client
  if (clientId) {
    const upper = clientId.toUpperCase().replace(/-/g, '_')
    const specificKey = env[`PS_API_KEY_${upper}`]
    const specificUrl = env[`PS_URL_${upper}`]

    if (specificKey && specificUrl) {
      return { apiKey: specificKey, apiUrl: specificUrl }
    }
  }

  // Fallback : credentials par d\u00e9faut
  const apiKey = config.prestashopApiKey as string
  const apiUrl = (config.public.apiBase as string) || 'http://localhost:8080/api'

  if (!apiKey) {
    throw createError({ statusCode: 500, message: 'PRESTASHOP_API_KEY non d\u00e9finie' })
  }

  return { apiKey, apiUrl }
}

// ── G\u00e9n\u00e9rique : appel PS Webservice JSON ─────────────────────────────────────

export async function psApiFetch<T>(
  resource: string,
  query: Record<string, string | number> = {},
  clientId?: string,
): Promise<T> {
  const { apiUrl, apiKey } = resolveCredentials(clientId)
  const auth = Buffer.from(`${apiKey}:`).toString('base64')

  const res = await $fetch<T>(`${apiUrl}/${resource}`, {
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: 'application/json',
    },
    query: {
      output_format: 'JSON',
      ...query,
    },
  })

  return res
}

// ── Produits par cat\u00e9gorie ──────────────────────────────────────────────────────

export async function fetchProductsByCategory(
  categoryId: number,
  limit = 50,
  clientId?: string,
): Promise<CatalogProduct[]> {
  try {
    // \u00c9tape 1 : r\u00e9cup\u00e9rer les IDs produits via les associations de la cat\u00e9gorie
    const catData = await psApiFetch<{ category?: any }>(`categories/${categoryId}`, {}, clientId)
    const productAssocs = catData?.category?.associations?.products ?? []
    if (!productAssocs.length) return []

    // Limiter le nombre d\u2019IDs
    const productIds = productAssocs.slice(0, limit).map((p: any) => Number(p.id))
    if (!productIds.length) return []

    // \u00c9tape 2 : r\u00e9cup\u00e9rer les d\u00e9tails des produits par batch d\u2019IDs
    const idFilter = productIds.join('|')
    const data = await psApiFetch<{ products?: any[] }>('products', {
      'filter[id]': `[${idFilter}]`,
      'filter[active]': '[1]',
      display: 'full',
      limit,
    }, clientId)

    const rawProducts = data?.products ?? []
    if (!rawProducts.length) return []

    // D\u00e9terminer la base URL pour les images
    const { apiUrl } = resolveCredentials(clientId)
    const psBase = apiUrl.replace(/\/api\/?$/, '')

    return rawProducts.map((p: any) => {
      const id = Number(p.id)
      const name = getLang(p.name)
      const price = Number(p.price || 0)
      const imageId = p.id_default_image

      // Gestion id_default_image (peut \u00eatre un objet ou un nombre)
      const imgId = typeof imageId === 'object' && imageId !== null
        ? Number(imageId.value ?? imageId.id ?? 0)
        : Number(imageId || 0)

      return {
        id,
        name,
        ref:   p.reference || '',
        price: new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(price),
        image: imgId > 0 ? buildImageUrl(psBase, id, imgId) : undefined,
        active: p.active === '1',
        description_short: stripHtml(getLang(p.description_short)).slice(0, 200),
      }
    })
  } catch (err: any) {
    console.error(`[prestashop-api] fetchProductsByCategory(${categoryId}, client=${clientId}) error:`, err?.message || err)
    return []
  }
}

// ── URL image PS ────────────────────────────────────────────────────────────────

/**
 * Builds a PrestaShop product image URL.
 * PrestaShop fragments images into subdirectories: /img/p/1/2/3/123-home_default.jpg
 */
function buildImageUrl(psBase: string, _productId: number, imageId: number): string {
  const digits = imageId.toString().split('')
  const path = digits.join('/')
  return `${psBase}/img/p/${path}/${imageId}-home_default.jpg`
}
