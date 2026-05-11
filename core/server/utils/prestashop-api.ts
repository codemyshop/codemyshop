

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

interface PsCredentials {
  apiUrl: string
  apiKey: string
}

export function resolveCredentials(clientId?: string): PsCredentials {
  const config = useRuntimeConfig()
  const env = process.env

  
  if (clientId) {
    const upper = clientId.toUpperCase().replace(/-/g, '_')
    const specificKey = env[`PS_API_KEY_${upper}`]
    const specificUrl = env[`PS_URL_${upper}`]

    if (specificKey && specificUrl) {
      return { apiKey: specificKey, apiUrl: specificUrl }
    }
  }

  
  const apiKey = config.prestashopApiKey as string
  const apiUrl = (config.public.apiBase as string) || 'http://localhost:8080/api'

  if (!apiKey) {
    throw createError({ statusCode: 500, message: 'PRESTASHOP_API_KEY non d\u00e9finie' })
  }

  return { apiKey, apiUrl }
}

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

export async function fetchProductsByCategory(
  categoryId: number,
  limit = 50,
  clientId?: string,
): Promise<CatalogProduct[]> {
  try {
    
    const catData = await psApiFetch<{ category?: any }>(`categories/${categoryId}`, {}, clientId)
    const productAssocs = catData?.category?.associations?.products ?? []
    if (!productAssocs.length) return []

    
    const productIds = productAssocs.slice(0, limit).map((p: any) => Number(p.id))
    if (!productIds.length) return []

    
    const idFilter = productIds.join('|')
    const data = await psApiFetch<{ products?: any[] }>('products', {
      'filter[id]': `[${idFilter}]`,
      'filter[active]': '[1]',
      display: 'full',
      limit,
    }, clientId)

    const rawProducts = data?.products ?? []
    if (!rawProducts.length) return []

    
    const { apiUrl } = resolveCredentials(clientId)
    const psBase = apiUrl.replace(/\/api\/?$/, '')

    return rawProducts.map((p: any) => {
      const id = Number(p.id)
      const name = getLang(p.name)
      const price = Number(p.price || 0)
      const imageId = p.id_default_image

      
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

function buildImageUrl(psBase: string, _productId: number, imageId: number): string {
  const digits = imageId.toString().split('')
  const path = digits.join('/')
  return `${psBase}/img/p/${path}/${imageId}-home_default.jpg`
}
