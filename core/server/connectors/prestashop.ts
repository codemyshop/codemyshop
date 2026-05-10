/**
 *
 * PrestaShop connector — implements BaseConnector.
 * All PrestaShop Webservice API-specific logic is isolated here.
 */

import type {
  BaseConnector, CatalogProduct, ProductDetail, ProductCombination,
  ProductFeatureValue, ProductAttachment,
  CatalogCategory, EmployeeInput, EmployeeResult, ClientContext,
  CartData, CartItemData, AddressData, CarrierData,
  OrderInput, OrderData, OrderItemData, OrderStatusData,
  CustomerData, ProductFilter, SpecificPrice, ProductListParams,
  ProductListResult, OrderHistoryEntry, RevenueStats, TopProduct,
} from './base'

// ── Credentials ───────────────────────────────────────────────────────────────

interface PsCredentials { apiUrl: string; apiKey: string }

function resolveCredentials(clientId: string): PsCredentials {
  const env = process.env

  // Clés spécifiques par client
  const upper = clientId.toUpperCase().replace(/-/g, '_')
  const specificKey = env[`PS_API_KEY_${upper}`]
  const specificUrl = env[`PS_URL_${upper}`]
  if (specificKey && specificUrl) return { apiKey: specificKey, apiUrl: specificUrl }

  // Clés depuis le store chiffré
  const stored = resolveClientPsCredentials(clientId)
  if (stored) return stored

  // Fallback par défaut
  const config = useRuntimeConfig()
  return {
    apiKey: config.prestashopApiKey as string || '',
    apiUrl: (config.public.apiBase as string) || 'http://localhost:8080/api',
  }
}

// ── HTTP helper ───────────────────────────────────────────────────────────────

async function psFetch<T>(creds: PsCredentials, resource: string, query: Record<string, any> = {}): Promise<T> {
  const auth = Buffer.from(`${creds.apiKey}:`).toString('base64')
  // PS exige le Host header pour ne pas rediriger (Docker interne)
  const hostHeader = new URL(creds.apiUrl).hostname === 'localhost' || new URL(creds.apiUrl).hostname === '127.0.0.1'
    ? (process.env.PS_HOST || process.env.NUXT_PS_HOST || 'localhost')
    : new URL(creds.apiUrl).host

  // Utilise webservice/dispatcher.php directement (bypass rewrite issues)
  const baseUrl = creds.apiUrl.replace(/\/api\/?$/, '')
  const url = `${baseUrl}/webservice/dispatcher.php`

  // Use native http to avoid $fetch following redirects to Nuxt
  const http = await import('node:http')
  const queryStr = new URLSearchParams({ output_format: 'JSON', url: resource, ...query } as Record<string, string>).toString()

  return new Promise<T>((resolve, reject) => {
    const req = http.request(`${url}?${queryStr}`, {
      headers: { Authorization: `Basic ${auth}`, Accept: 'application/json', Host: hostHeader },
    }, (res) => {
      let data = ''
      res.on('data', (chunk: Buffer) => { data += chunk.toString() })
      res.on('end', () => {
        if (res.statusCode === 302 || res.statusCode === 301) {
          reject(new Error(`PS redirect ${res.statusCode} → ${res.headers.location}`))
          return
        }
        try { resolve(JSON.parse(data) as T) }
        catch { reject(new Error(`PS invalid JSON: ${data.slice(0, 100)}`)) }
      })
    })
    req.on('error', reject)
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('PS timeout')) })
    req.end()
  })
}

function psBaseUrl(creds: PsCredentials): string {
  const raw = creds.apiUrl.replace(/\/api\/?$/, '')
  // Si l'URL API est localhost, les images doivent être servies via le domaine public
  if (raw.includes('localhost') || raw.includes('127.0.0.1')) {
    const publicHost = process.env.NUXT_PUBLIC_PS_FRONT_URL || process.env.PS_HOST
    if (publicHost) return publicHost.startsWith('http') ? publicHost : `https://${publicHost}`
  }
  return raw
}

function buildImageUrl(base: string, imageId: number, size = 'home_default'): string {
  const digits = imageId.toString().split('')
  return `${base}/img/p/${digits.join('/')}/${imageId}-${size}.jpg`
}

function extractImageId(field: any): number {
  if (typeof field === 'object' && field !== null) return Number(field.value ?? field.id ?? 0)
  return Number(field || 0)
}

// ── Response normalization ────────────────────────────────────────────────────
// dispatcher.php renvoie { "carts": [{…}] } (pluriel+array) au lieu de { "cart": {…} } (singulier).
// Ce helper extrait le premier objet peu importe le format retourné.
function psExtract(data: any, singular: string): any {
  if (!data) return null
  // Format singulier classique (POST response)
  if (data[singular]) return data[singular]
  // Format pluriel dispatcher.php (GET response) — "cart" → "carts"
  const plural = singular + 's'
  if (Array.isArray(data[plural])) return data[plural][0] ?? null
  // Format pluriel irrégulier (ex: "address" → "addresses")
  const pluralEs = singular + 'es'
  if (Array.isArray(data[pluralEs])) return data[pluralEs][0] ?? null
  // Dernier recours : prendre la première clé qui est un array
  for (const key of Object.keys(data)) {
    if (Array.isArray(data[key]) && data[key].length > 0) return data[key][0]
  }
  return null
}

// ── XML helpers ──────────────────────────────────────────────────────────────

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function psHostHeader(creds: PsCredentials): string {
  const hostname = new URL(creds.apiUrl).hostname
  return (hostname === 'localhost' || hostname === '127.0.0.1')
    ? (process.env.PS_HOST || process.env.NUXT_PS_HOST || 'localhost')
    : new URL(creds.apiUrl).host
}

function psDispatcherUrl(creds: PsCredentials): string {
  return creds.apiUrl.replace(/\/api\/?$/, '') + '/webservice/dispatcher.php'
}

async function psPost<T>(creds: PsCredentials, resource: string, xml: string): Promise<T> {
  // Utilise dispatcher.php comme psFetch (les rewrites /api/* ne marchent pas partout en POST)
  const baseUrl = creds.apiUrl.replace(/\/api\/?$/, '')
  const dispatcherUrl = `${baseUrl}/webservice/dispatcher.php`
  const qs = new URLSearchParams({ output_format: 'JSON', url: resource }).toString()
  const url = new URL(`${dispatcherUrl}?${qs}`)
  const auth = Buffer.from(`${creds.apiKey}:`).toString('base64')
  const host = psHostHeader(creds)

  console.log(`[ps-connector] POST ${resource} → ${url.href} (Host: ${host})`)

  const { default: http } = await import('node:http')
  return new Promise<T>((resolve, reject) => {
    const req = http.request({
      hostname: url.hostname,
      port: Number(url.port) || 80,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/xml',
        Host: host,
      },
    }, (res) => {
      let body = ''
      res.on('data', (chunk: Buffer) => { body += chunk.toString() })
      res.on('end', () => {
        console.log(`[ps-connector] POST ${resource} → ${res.statusCode} (${body.length} bytes)`)
        if (res.statusCode && res.statusCode >= 400) {
          console.error(`[ps-connector] POST ${resource} BODY: ${body.substring(0, 500)}`)
          reject(new Error(`PS API POST ${resource}: ${res.statusCode} — ${body.substring(0, 200)}`))
          return
        }
        try { resolve(JSON.parse(body)) }
        catch {
          console.error(`[ps-connector] POST ${resource} invalid JSON: ${body.substring(0, 500)}`)
          reject(new Error(`PS API POST ${resource}: invalid JSON — ${body.substring(0, 200)}`))
        }
      })
    })
    req.on('error', (err) => { console.error(`[ps-connector] POST ${resource} network error:`, err.message); reject(err) })
    req.write(xml)
    req.end()
  })
}

async function psPut<T>(creds: PsCredentials, resource: string, xml: string): Promise<T> {
  // Utilise dispatcher.php comme psFetch
  const baseUrl = creds.apiUrl.replace(/\/api\/?$/, '')
  const dispatcherUrl = `${baseUrl}/webservice/dispatcher.php`
  const qs = new URLSearchParams({ output_format: 'JSON', url: resource }).toString()
  const url = new URL(`${dispatcherUrl}?${qs}`)
  const auth = Buffer.from(`${creds.apiKey}:`).toString('base64')
  const host = psHostHeader(creds)

  console.log(`[ps-connector] PUT ${resource} → ${url.href} (Host: ${host})`)

  const { default: http } = await import('node:http')
  return new Promise<T>((resolve, reject) => {
    const req = http.request({
      hostname: url.hostname,
      port: Number(url.port) || 80,
      path: url.pathname + url.search,
      method: 'PUT',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/xml',
        Host: host,
      },
    }, (res) => {
      let body = ''
      res.on('data', (chunk: Buffer) => { body += chunk.toString() })
      res.on('end', () => {
        console.log(`[ps-connector] PUT ${resource} → ${res.statusCode} (${body.length} bytes)`)
        if (res.statusCode && res.statusCode >= 400) {
          console.error(`[ps-connector] PUT ${resource} BODY: ${body.substring(0, 500)}`)
          reject(new Error(`PS API PUT ${resource}: ${res.statusCode} — ${body.substring(0, 200)}`))
          return
        }
        try { resolve(JSON.parse(body)) }
        catch {
          console.error(`[ps-connector] PUT ${resource} invalid JSON: ${body.substring(0, 500)}`)
          reject(new Error(`PS API PUT ${resource}: invalid JSON — ${body.substring(0, 200)}`))
        }
      })
    })
    req.on('error', (err) => { console.error(`[ps-connector] PUT ${resource} network error:`, err.message); reject(err) })
    req.write(xml)
    req.end()
  })
}

async function psDelete(creds: PsCredentials, resource: string): Promise<boolean> {
  const auth = Buffer.from(`${creds.apiKey}:`).toString('base64')
  try {
    await $fetch(psDispatcherUrl(creds), {
      method: 'DELETE',
      headers: { Authorization: `Basic ${auth}`, Host: psHostHeader(creds) },
      query: { url: resource },
    })
    return true
  } catch { return false }
}

function formatPrice(n: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
}

// ── Connecteur ────────────────────────────────────────────────────────────────

export class PrestashopConnector implements BaseConnector {
  readonly platform = 'prestashop'
  readonly clientId: string
  private creds: PsCredentials

  /** Cache mémo des définitions de features (chargé une fois par instance/process) */
  private featureDefsCache: Map<number, string> | null = null
  /** Memoized cache of feature values (id_feature_value → text) */
  private featureValuesCache: Map<number, string> | null = null

  constructor(clientId: string) {
    this.clientId = clientId
    this.creds = resolveCredentials(clientId)
  }

  /**
   * Loads and memoizes feature definitions (features and their values).
   * For Example Shop: ~10 features and 1118 values — loaded once.
   * The cache is attached to the connector instance (reused across subsequent requests).
   */
  private async loadFeaturesIndex(): Promise<void> {
    if (this.featureDefsCache && this.featureValuesCache) return

    this.featureDefsCache = new Map()
    this.featureValuesCache = new Map()

    try {
      const featData = await psFetch<{ product_features?: any[] }>(this.creds, 'product_features', {
        display: 'full', limit: 200,
      }).catch(() => null)
      for (const f of featData?.product_features ?? []) {
        this.featureDefsCache.set(Number(f.id), getLang(f.name) || `Feature ${f.id}`)
      }

      const valData = await psFetch<{ product_feature_values?: any[] }>(this.creds, 'product_feature_values', {
        display: 'full', limit: 5000,
      }).catch(() => null)
      for (const v of valData?.product_feature_values ?? []) {
        this.featureValuesCache.set(Number(v.id), getLang(v.value) || '')
      }
    } catch (err: any) {
      console.error('[ps-connector] loadFeaturesIndex error:', err?.message)
    }
  }

  /**
   * Resolves the ProductFeatureValue of a product from its association
   * `product_features = [{id: id_feature, id_feature_value}, …]`.
   */
  private async resolveProductFeatures(assoc: any[]): Promise<ProductFeatureValue[]> {
    if (!assoc?.length) return []
    await this.loadFeaturesIndex()
    const out: ProductFeatureValue[] = []
    for (const f of assoc) {
      const idFeature = Number(f.id)
      const idValue   = Number(f.id_feature_value)
      const name  = this.featureDefsCache?.get(idFeature) || ''
      const value = this.featureValuesCache?.get(idValue) || ''
      if (name && value) {
        out.push({ id: idFeature, name, valueId: idValue, value })
      }
    }
    return out
  }

  // ── Attachments (fiches techniques) ─────────────────────────────────────

  private async resolveProductAttachments(assoc: any[]): Promise<ProductAttachment[]> {
    if (!assoc?.length) return []
    try {
      const ids = assoc.map((a: any) => Number(a.id)).filter(Boolean)
      if (!ids.length) return []
      const data = await psFetch<{ product_attachments?: any[] }>(this.creds, 'product_attachments', {
        'filter[id]': `[${ids.join('|')}]`,
        display: 'full',
      })
      const items = data?.product_attachments ?? []
      return items.map((a: any) => ({
        id: Number(a.id),
        name: getLang(a.name) || a.file_name || 'Fiche technique',
        fileName: a.file_name || '',
        mime: a.mime || '',
        fileSize: Number(a.file_size || 0),
      }))
    } catch {
      return []
    }
  }

  // ── Accès générique à une ressource PS API ─────────────────────────────

  async fetchResource(resource: string, query: Record<string, string> = {}): Promise<any> {
    return psFetch<any>(this.creds, resource, query)
  }

  /** Download attachment binary via PS webservice */
  async downloadAttachment(attachmentId: number): Promise<{ buffer: Buffer; mime: string; fileName: string } | null> {
    try {
      // Get metadata first
      const meta = await psFetch<{ product_attachments?: any[] }>(this.creds, 'product_attachments', {
        'filter[id]': `[${attachmentId}]`,
        display: 'full',
      })
      const att = (meta?.product_attachments ?? [])[0]
      if (!att) return null

      const baseUrl = this.creds.apiUrl.replace(/\/api\/?$/, '')
      const auth = Buffer.from(`${this.creds.apiKey}:`).toString('base64')
      const hostHeader = psHostHeader(this.creds)
      const dispatcherUrl = `${baseUrl}/webservice/dispatcher.php`
      const qs = new URLSearchParams({ url: `attachments/${attachmentId}` }).toString()

      const http = await import('node:http')
      const buffer = await new Promise<Buffer>((resolve, reject) => {
        const req = http.request(`${dispatcherUrl}?${qs}`, {
          headers: { Authorization: `Basic ${auth}`, Accept: 'application/octet-stream', Host: hostHeader },
        }, (res) => {
          if (res.statusCode !== 200) { reject(new Error(`PS attachment ${res.statusCode}`)); return }
          const chunks: Buffer[] = []
          res.on('data', (chunk: Buffer) => chunks.push(chunk))
          res.on('end', () => resolve(Buffer.concat(chunks)))
        })
        req.on('error', reject)
        req.setTimeout(30000, () => { req.destroy(); reject(new Error('Download timeout')) })
        req.end()
      })

      return { buffer, mime: att.mime || 'application/octet-stream', fileName: att.file_name || `attachment-${attachmentId}` }
    } catch { return null }
  }

  // ── Products by category ──────────────────────────────────────────────────

  async getProducts(categoryId: number, limit = 50): Promise<CatalogProduct[]> {
    try {
      const catData = await psFetch<any>(this.creds, `categories/${categoryId}`)
      const assocs = catData?.category?.associations?.products ?? []
      if (!assocs.length) return []

      const ids = assocs.slice(0, limit).map((p: any) => Number(p.id))
      const data = await psFetch<{ products?: any[] }>(this.creds, 'products', {
        'filter[id]': `[${ids.join('|')}]`,
        'filter[active]': '[1]',
        display: 'full',
        limit,
      })

      const base = psBaseUrl(this.creds)
      return (data?.products ?? []).map((p: any) => {
        const price = Number(p.price || 0)
        const imgId = extractImageId(p.id_default_image)
        return {
          id:     Number(p.id),
          name:   getLang(p.name),
          ref:    p.reference || '',
          price:  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(price),
          priceRaw: price,
          image:  imgId > 0 ? buildImageUrl(base, imgId) : undefined,
          active: p.active === '1',
          description_short: stripHtml(getLang(p.description_short)).slice(0, 200),
        }
      })
    } catch (err: any) {
      console.error(`[ps-connector] getProducts(${categoryId}) error:`, err?.message)
      return []
    }
  }

  // ── Nouveaux produits ──────────────────────────────────────────────────

  async getNewProducts(limit: number = 8): Promise<CatalogProduct[]> {
    try {
      // PrestaShop may reject combined sort+filter — we fetch more and sort server-side
      const data = await psFetch<{ products?: any[] }>(this.creds, 'products', {
        display: 'full',
        limit: limit * 3,
        sort: '[date_add_DESC]',
      }).catch(() =>
        // Fallback if sort is not supported: fetch without sort
        psFetch<{ products?: any[] }>(this.creds, 'products', { display: 'full', limit: limit * 3 })
      )

      const base = psBaseUrl(this.creds)
      return (data?.products ?? [])
        .filter((p: any) => p.active === '1')
        .slice(0, limit)
        .map((p: any) => {
          const price = Number(p.price || 0)
          const imgId = extractImageId(p.id_default_image)
          return {
            id:     Number(p.id),
            name:   getLang(p.name),
            ref:    p.reference || '',
            price:  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(price),
            priceRaw: price,
            image:  imgId > 0 ? buildImageUrl(base, imgId) : undefined,
            active: true,
            description_short: stripHtml(getLang(p.description_short)).slice(0, 200),
          }
        })
    } catch (err: any) {
      console.error('[ps-connector] getNewProducts error:', err?.message)
      return []
    }
  }

  // ── Recherche produits ─────────────────────────────────────────────────
  // Uses the native PrestaShop `search` webservice (leverages ps_search_index +
  // ps_search_word : tokenisation, accents, stemming, features, description)
  // rather than a simple LIKE on name. Fallback to LIKE name if the engine
  // native fails (e.g., empty index on a store).

  async searchProducts(query: string, limit: number = 50, idLang: number = 1): Promise<CatalogProduct[]> {
    const q = query.trim()
    if (!q) return []

    const langStr = String(idLang || 1)
    const base = psBaseUrl(this.creds)
    const hydrate = (products: any[]): CatalogProduct[] =>
      products.map((p: any) => {
        const price = Number(p.price || 0)
        const imgId = extractImageId(p.id_default_image)
        return {
          id:     Number(p.id),
          name:   getLang(p.name),
          ref:    p.reference || '',
          price:  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(price),
          priceRaw: price,
          image:  imgId > 0 ? buildImageUrl(base, imgId) : undefined,
          active: p.active === '1',
          description_short: stripHtml(getLang(p.description_short)).slice(0, 200),
        }
      })

    try {
      const search = await psFetch<{ products?: { id: string | number }[] }>(this.creds, 'search', {
        query: q,
        language: langStr,
        limit: String(limit * 2),
      })
      const orderedIds = (search?.products ?? [])
        .map((p) => Number(p.id))
        .filter((id) => id > 0)

      if (orderedIds.length) {
        const ids = orderedIds.slice(0, limit * 2)
        const data = await psFetch<{ products?: any[] }>(this.creds, 'products', {
          'filter[id]': `[${ids.join('|')}]`,
          'filter[active]': '[1]',
          display: 'full',
          limit: limit * 2,
          language: langStr,
        })
        const byId = new Map<number, any>((data?.products ?? []).map((p: any) => [Number(p.id), p]))
        const ordered = ids
          .map((id) => byId.get(id))
          .filter((p) => p && p.active === '1')
          .slice(0, limit)
        return hydrate(ordered)
      }
    } catch (err: any) {
      console.warn('[ps-connector] searchProducts native search failed, falling back to LIKE:', err?.message)
    }

    try {
      const data = await psFetch<{ products?: any[] }>(this.creds, 'products', {
        'filter[name]': `%[${q}]%`,
        'filter[active]': '[1]',
        display: 'full',
        limit: limit * 2,
        language: langStr,
      })
      return hydrate((data?.products ?? []).slice(0, limit))
    } catch (err: any) {
      console.error('[ps-connector] searchProducts fallback error:', err?.message)
      return []
    }
  }

  // ── Detailed product ───────────────────────────────────────────────────

  async getProduct(id: number, idLang: number = 1): Promise<ProductDetail | null> {
    try {
      const data = await psFetch<any>(this.creds, `products/${id}`, { display: 'full', language: String(idLang || 1) })
      const p = psExtract(data, 'product')
      if (!p) return null

      const base = psBaseUrl(this.creds)
      const images = (p.associations?.images ?? []).map((img: any) =>
        buildImageUrl(base, Number(img.id), 'large_default')
      )
      if (!images.length) {
        const defImg = extractImageId(p.id_default_image)
        if (defImg > 0) images.push(buildImageUrl(base, defImg, 'large_default'))
      }

      // Combinations
      const combinations: ProductCombination[] = []
      const comboAssocs = p.associations?.combinations ?? []
      if (comboAssocs.length) {
        try {
          const comboIds = comboAssocs.slice(0, 50).map((c: any) => Number(c.id))
          const comboData = await psFetch<{ combinations?: any[] }>(this.creds, 'combinations', {
            'filter[id]': `[${comboIds.join('|')}]`,
            display: 'full',
          })
          for (const combo of comboData?.combinations ?? []) {
            const attrs: string[] = []
            for (const ov of (combo.associations?.product_option_values ?? []).slice(0, 5)) {
              try {
                const ovData = await psFetch<any>(this.creds, `product_option_values/${ov.id}`)
                attrs.push(getLang(ovData?.product_option_value?.name) || `Option ${ov.id}`)
              } catch { attrs.push(`Option ${ov.id}`) }
            }
            combinations.push({
              id: Number(combo.id), reference: combo.reference || '',
              price: Number(combo.price || 0), quantity: Number(combo.quantity || 0),
              attributes: attrs,
            })
          }
        } catch { /* silencieux */ }
      }

      // Feature resolution (size, origin, packaging…)
      const features = await this.resolveProductFeatures(p.associations?.product_features ?? [])

      // Fiches techniques (attachments)
      const attachments = await this.resolveProductAttachments(p.associations?.product_attachments ?? [])

      const price = Number(p.price || 0)
      return {
        id: Number(p.id), name: getLang(p.name), reference: p.reference || '',
        price, priceFormatted: new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(price),
        description: getLang(p.description) || '', descriptionShort: getLang(p.description_short) || '',
        weight: p.weight || '0', ean13: p.ean13 || '',
        quantity: Number(p.quantity ?? 0), active: p.active === '1',
        images, combinations, features, attachments,
      }
    } catch (err: any) {
      console.error(`[ps-connector] getProduct(${id}) error:`, err?.message)
      return null
    }
  }

  // ── Categories ─────────────────────────────────────────────────────────

  async getCategories(limit = 50, idLang: number = 1): Promise<CatalogCategory[]> {
    try {
      const data = await psFetch<{ categories?: any[] }>(this.creds, 'categories', {
        'filter[active]': '[1]',
        display: '[id,name,description,meta_description,id_parent,active]',
        limit, sort: 'name_ASC',
        language: String(idLang || 1),
      })
      return (data?.categories ?? [])
        .filter((c: any) => Number(c.id) > 2)
        .map((c: any) => ({
          id: Number(c.id), name: getLang(c.name),
          description: getLang(c.description), meta_description: getLang(c.meta_description),
          id_parent: Number(c.id_parent || 0), productCount: null,
        }))
    } catch (err: any) {
      console.error(`[ps-connector] getCategories error:`, err?.message)
      return []
    }
  }

  // ── Employees ──────────────────────────────────────────────────────────

  async createEmployee(data: EmployeeInput): Promise<EmployeeResult> {
    const profileId = getPsProfileId(data.role)
    const password = data.password || (await import('node:crypto')).randomBytes(12).toString('base64url').slice(0, 16)
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <employee>
    <firstname><![CDATA[${esc(data.firstname)}]]></firstname>
    <lastname><![CDATA[${esc(data.lastname)}]]></lastname>
    <email><![CDATA[${esc(data.email)}]]></email>
    <passwd><![CDATA[${esc(password)}]]></passwd>
    <id_profile>${profileId}</id_profile>
    <id_lang>1</id_lang>
    <active>1</active>
    <default_tab>1</default_tab>
  </employee>
</prestashop>`

    try {
      const auth = Buffer.from(`${this.creds.apiKey}:`).toString('base64')
      const res = await $fetch<string>(`${this.creds.apiUrl}/employees`, {
        method: 'POST',
        headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/xml' },
        body: xml, responseType: 'text',
      })
      const match = String(res).match(/<id>(?:<!\[CDATA\[)?(\d+)/)
      return { id: match ? Number(match[1]) : null, error: null, generatedPassword: data.password ? undefined : password }
    } catch (err: any) {
      return { id: null, error: err?.message || 'Erreur Webservice PS', generatedPassword: data.password ? undefined : password }
    }
  }

  // ── Contexte IA ────────────────────────────────────────────────────────

  async getClientContext(): Promise<ClientContext> {
    const clientName = this.clientId
    try {
      const prodData = await psFetch<{ products?: any[] }>(this.creds, 'products', {
        'filter[active]': '[1]', display: '[id,price,id_category_default]', limit: 500,
      })
      const products = prodData?.products ?? []

      const catsData = await psFetch<{ categories?: any[] }>(this.creds, 'categories', {
        'filter[active]': '[1]', display: '[id,name]', limit: 200,
      })
      const cats = (catsData?.categories ?? []).filter((c: any) => Number(c.id) > 2)

      const prices = products.map((p: any) => Number(p.price || 0)).filter((p: number) => p > 0)
      const avgPrice = prices.length ? prices.reduce((a: number, b: number) => a + b, 0) / prices.length : 0

      const catCount: Record<string, number> = {}
      for (const p of products) catCount[String(p.id_category_default)] = (catCount[String(p.id_category_default)] ?? 0) + 1
      const topCatIds = Object.entries(catCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id]) => id)
      const topCategories = topCatIds.map(id => { const c = cats.find((c: any) => String(c.id) === id); return c ? getLang(c.name) : `Cat #${id}` })

      return {
        clientId: this.clientId, clientName,
        totalProducts: products.length, totalCategories: cats.length,
        avgPrice: Math.round(avgPrice * 100) / 100,
        avgPriceFormatted: new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(avgPrice),
        priceRange: { min: Math.round((prices.length ? Math.min(...prices) : 0) * 100) / 100, max: Math.round((prices.length ? Math.max(...prices) : 0) * 100) / 100 },
        topCategories, businessType: avgPrice > 50 ? 'B2B' : avgPrice > 15 ? 'Mixte' : 'B2C',
        catalogStrength: products.length > 500 ? 'Large' : products.length > 100 ? 'Moyen' : 'Petit',
        fetchedAt: new Date().toISOString(),
      }
    } catch (err: any) {
      console.error(`[ps-connector] getClientContext error:`, err?.message)
      return { clientId: this.clientId, clientName, totalProducts: 0, totalCategories: 0, avgPrice: 0, avgPriceFormatted: '0 \u20ac', priceRange: { min: 0, max: 0 }, topCategories: [], businessType: 'Inconnu', catalogStrength: 'Inconnu', fetchedAt: new Date().toISOString() }
    }
  }

  // ── Advanced catalog ────────────────────────────────────────────────────

  private mapProduct(p: any): CatalogProduct {
    const base = psBaseUrl(this.creds)
    const price = Number(p.price || 0)
    const imgId = extractImageId(p.id_default_image)
    return {
      id: Number(p.id), name: getLang(p.name), ref: p.reference || '',
      price: formatPrice(price), priceRaw: price,
      image: imgId > 0 ? buildImageUrl(base, imgId) : undefined,
      active: p.active === '1',
      description_short: stripHtml(getLang(p.description_short)).slice(0, 200),
    }
  }

  async listProducts(params: ProductListParams): Promise<ProductListResult> {
    try {
      const query: Record<string, any> = {
        'filter[active]': '[1]',
        display: 'full',
      }

      // Sort
      const sortMap: Record<string, string> = {
        name_asc: '[name_ASC]', name_desc: '[name_DESC]',
        price_asc: '[price_ASC]', price_desc: '[price_DESC]',
        date_desc: '[date_add_DESC]',
      }
      if (params.sort) query.sort = sortMap[params.sort] || '[name_ASC]'

      // Category filter — get product IDs from category first
      let scopedIds: number[] | null = null
      if (params.categoryId) {
        const catData = await psFetch<any>(this.creds, `categories/${params.categoryId}`)
        const assocs = catData?.category?.associations?.products ?? []
        scopedIds = assocs.map((p: any) => Number(p.id))
        if (!scopedIds.length) return { products: [], total: 0, page: params.page || 1, limit: params.limit || 24, filters: [] }
        query['filter[id]'] = `[${scopedIds.join('|')}]`
        query.limit = 500
      } else {
        query.limit = 500
      }

      // Search query
      if (params.query) query['filter[name]'] = `%[${params.query}]%`

      const data = await psFetch<{ products?: any[] }>(this.creds, 'products', query)
      const rawProducts = data?.products ?? []

      // Index features par produit (id_product → Set<id_feature_value>)
      const productFeatureMap = new Map<number, Set<number>>()
      for (const p of rawProducts) {
        const pid = Number(p.id)
        const set = new Set<number>()
        const assocs = p.associations?.product_features ?? []
        for (const f of assocs) {
          const vId = Number(f.id_feature_value)
          if (vId > 0) set.add(vId)
        }
        productFeatureMap.set(pid, set)
      }

      let allProducts = rawProducts.map((p: any) => this.mapProduct(p))

      // Price filter (client-side, PS webservice filter[price] est unreliable)
      if (params.priceMin !== undefined && params.priceMin > 0) {
        allProducts = allProducts.filter(p => p.priceRaw >= params.priceMin!)
      }
      if (params.priceMax !== undefined && params.priceMax < 99999) {
        allProducts = allProducts.filter(p => p.priceRaw <= params.priceMax!)
      }

      // Feature filter (AND intersection between features, OR between values of a feature)
      const featureFilter = params.features || {}
      const activeFeatureIds = Object.keys(featureFilter).map(Number).filter(id => featureFilter[id]?.length)
      if (activeFeatureIds.length) {
        allProducts = allProducts.filter(p => {
          const pSet = productFeatureMap.get(p.id) || new Set()
          for (const fId of activeFeatureIds) {
            const wanted = featureFilter[fId]
            if (!wanted.some(v => pSet.has(v))) return false
          }
          return true
        })
      }

      const total = allProducts.length

      // Sort client-side fallback (PrestaShop sort is fragile with filter[id])
      if (params.sort === 'name_asc') allProducts.sort((a, b) => a.name.localeCompare(b.name))
      else if (params.sort === 'name_desc') allProducts.sort((a, b) => b.name.localeCompare(a.name))
      else if (params.sort === 'price_asc') allProducts.sort((a, b) => a.priceRaw - b.priceRaw)
      else if (params.sort === 'price_desc') allProducts.sort((a, b) => b.priceRaw - a.priceRaw)

      // Pagination client-side
      const page = params.page || 1
      const limit = params.limit || 24
      const start = (page - 1) * limit
      const products = allProducts.slice(start, start + limit)

      // Pre-scope for facets: IDs passing the PRICE filter (but NOT the features filter).
      // We intentionally exclude the features filter so we can break it down by feature in buildScopedFilters.
      const priceFilteredIds: number[] = []
      for (const p of rawProducts) {
        const pid = Number(p.id)
        const price = Number(p.price || 0)
        if (params.priceMin !== undefined && params.priceMin > 0 && price < params.priceMin) continue
        if (params.priceMax !== undefined && params.priceMax < 99999 && price > params.priceMax) continue
        priceFilteredIds.push(pid)
      }

      // Scoped filters + live counts (Algolia-style: for each feature F,
      // we compute counts excluding filter F itself)
      const filters = await this.buildScopedFilters(priceFilteredIds, productFeatureMap, featureFilter)

      return { products, total, page, limit, filters }
    } catch (err: any) {
      console.error(`[ps-connector] listProducts error:`, err?.message)
      return { products: [], total: 0, page: 1, limit: 24, filters: [] }
    }
  }

  /**
   * Computes "live" facets (Algolia-style):
   * - Scope = products passing category + price filters (but not features)
   * - For each feature F, the count of a value V is the number of products
   * passing all feature filters EXCEPT F (to allow checking other values of F).
   * - A value with count=0 is filtered to avoid cluttering the UI.
   */
  private async buildScopedFilters(
    scopedIds: number[],
    productFeatureMap: Map<number, Set<number>>,
    activeFilter: Record<number, number[]>,
  ): Promise<ProductFilter[]> {
    if (!scopedIds.length) return []
    try {
      await this.loadFeaturesIndex()
      // Mapping global id_feature_value → id_feature
      const valueToFeature = new Map<number, number>()
      const fpData = await psFetch<{ product_feature_values?: any[] }>(this.creds, 'product_feature_values', {
        display: '[id,id_feature]', limit: 2000,
      }).catch(() => null)
      for (const v of fpData?.product_feature_values ?? []) {
        valueToFeature.set(Number(v.id), Number(v.id_feature))
      }

      const scopedProductsRaw = scopedIds.filter(id => productFeatureMap.has(id))

      // Construit l'ensemble des produits du scope passant tous les filtres features SAUF F.
      const buildSetExcluding = (excludedFeatureId: number | null): Set<number> => {
        const out = new Set<number>()
        for (const pid of scopedProductsRaw) {
          const pSet = productFeatureMap.get(pid) || new Set()
          let keep = true
          for (const [fIdStr, wanted] of Object.entries(activeFilter)) {
            const fId = Number(fIdStr)
            if (fId === excludedFeatureId) continue
            if (!wanted?.length) continue
            if (!wanted.some(v => pSet.has(v))) { keep = false; break }
          }
          if (keep) out.add(pid)
        }
        return out
      }

      // Récolte de toutes les feature_values présentes dans le scope brut
      const valuesPresent = new Set<number>()
      for (const pid of scopedProductsRaw) {
        for (const v of productFeatureMap.get(pid) || []) valuesPresent.add(v)
      }

      // Bucket par feature
      const buckets = new Map<number, Map<number, number>>() // featureId → (valueId → count)
      // Précalcule des sets "tous filtres sauf F"
      const setCache = new Map<number | null, Set<number>>()
      for (const vId of valuesPresent) {
        const fId = valueToFeature.get(vId)
        if (!fId) continue
        let scopeSet = setCache.get(fId)
        if (!scopeSet) {
          scopeSet = buildSetExcluding(fId)
          setCache.set(fId, scopeSet)
        }
        let count = 0
        for (const pid of scopeSet) {
          if ((productFeatureMap.get(pid) || new Set()).has(vId)) count++
        }
        if (count === 0) continue
        let bucket = buckets.get(fId)
        if (!bucket) { bucket = new Map(); buckets.set(fId, bucket) }
        bucket.set(vId, count)
      }

      // Sérialisation finale, triée par count desc
      const filters: ProductFilter[] = []
      for (const [fId, bucket] of buckets) {
        const fName = this.featureDefsCache?.get(fId) || `Feature ${fId}`
        const values = Array.from(bucket.entries())
          .map(([vId, count]) => ({
            id: vId,
            name: this.featureValuesCache?.get(vId) || `Valeur ${vId}`,
            count,
          }))
          .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
        filters.push({ id: fId, name: fName, values })
      }
      // Tri des features par nombre total de produits (les plus discriminantes en haut)
      filters.sort((a, b) => {
        const sa = a.values.reduce((s, v) => s + v.count, 0)
        const sb = b.values.reduce((s, v) => s + v.count, 0)
        return sb - sa
      })
      return filters
    } catch (err: any) {
      console.error('[ps-connector] buildScopedFilters error:', err?.message)
      return []
    }
  }

  async getSpecificPrices(): Promise<SpecificPrice[]> {
    try {
      const data = await psFetch<{ specific_prices?: any[] }>(this.creds, 'specific_prices', {
        display: 'full', limit: 500,
      })
      return (data?.specific_prices ?? []).map((sp: any) => ({
        productId: Number(sp.id_product),
        reduction: Number(sp.reduction || 0),
        reductionType: sp.reduction_type === 'amount' ? 'amount' as const : 'percentage' as const,
        fromQuantity: Number(sp.from_quantity || 1),
      }))
    } catch (err: any) {
      console.error(`[ps-connector] getSpecificPrices error:`, err?.message)
      return []
    }
  }

  async getBestSellers(limit = 10): Promise<CatalogProduct[]> {
    // PS webservice doesn't have a "best sellers" sort — use products sorted by date as fallback
    return this.getNewProducts(limit)
  }

  // ── CRUD Produits (BO) ────────────────────────────────────────────────

  async createProduct(data: any): Promise<{ id: number } | null> {
    try {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <product>
    <id_category_default>${data.categoryId || 2}</id_category_default>
    <id_tax_rules_group>${data.taxRulesGroupId || 1}</id_tax_rules_group>
    <type>simple</type>
    <active>${data.active !== false ? '1' : '0'}</active>
    <state>1</state>
    <price>${Number(data.price || 0).toFixed(6)}</price>
    <reference><![CDATA[${esc(data.reference || '')}]]></reference>
    <weight>${data.weight || '0'}</weight>
    <name><language id="1"><![CDATA[${esc(data.name || '')}]]></language></name>
    <description><language id="1"><![CDATA[${esc(data.description || '')}]]></language></description>
    <description_short><language id="1"><![CDATA[${esc(data.descriptionShort || '')}]]></language></description_short>
    <link_rewrite><language id="1"><![CDATA[${esc((data.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, ''))}]]></language></link_rewrite>
    <associations>
      <categories>
        <category><id>${data.categoryId || 2}</id></category>
      </categories>
    </associations>
  </product>
</prestashop>`

      const res = await psPost<any>(this.creds, 'products', xml)
      const product = psExtract(res, 'product')
      if (!product) return null
      return { id: Number(product.id) }
    } catch (err: any) {
      console.error(`[ps-connector] createProduct error:`, err?.message)
      return null
    }
  }

  async updateProduct(id: number, data: any): Promise<boolean> {
    try {
      const current = await psFetch<any>(this.creds, `products/${id}`, { display: 'full' })
      const p = psExtract(current, 'product')
      if (!p) return false

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <product>
    <id>${id}</id>
    <id_category_default>${data.categoryId || p.id_category_default}</id_category_default>
    <id_tax_rules_group>${p.id_tax_rules_group || 1}</id_tax_rules_group>
    <type>${p.type || 'simple'}</type>
    <active>${data.active !== undefined ? (data.active ? '1' : '0') : p.active}</active>
    <state>1</state>
    <price>${Number(data.price ?? p.price ?? 0).toFixed(6)}</price>
    <reference><![CDATA[${esc(data.reference || p.reference || '')}]]></reference>
    <weight>${data.weight || p.weight || '0'}</weight>
    <name><language id="1"><![CDATA[${esc(data.name || getLang(p.name))}]]></language></name>
    <description><language id="1"><![CDATA[${esc(data.description || getLang(p.description))}]]></language></description>
    <description_short><language id="1"><![CDATA[${esc(data.descriptionShort || getLang(p.description_short))}]]></language></description_short>
    <link_rewrite><language id="1"><![CDATA[${getLang(p.link_rewrite) || esc((data.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'))}]]></language></link_rewrite>
    <associations>
      <categories>
        <category><id>${data.categoryId || p.id_category_default}</id></category>
      </categories>
    </associations>
  </product>
</prestashop>`

      await psPut<any>(this.creds, `products/${id}`, xml)
      return true
    } catch (err: any) {
      console.error(`[ps-connector] updateProduct error:`, err?.message)
      return false
    }
  }

  async updateStock(productId: number, quantity: number): Promise<boolean> {
    try {
      // Fetch stock_available for this product
      const data = await psFetch<{ stock_availables?: any[] }>(this.creds, 'stock_availables', {
        'filter[id_product]': `[${productId}]`,
        'filter[id_product_attribute]': '[0]',
        display: 'full',
      })
      const stock = data?.stock_availables?.[0]
      if (!stock) return false

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <stock_available>
    <id>${stock.id}</id>
    <id_product>${productId}</id_product>
    <id_product_attribute>0</id_product_attribute>
    <id_shop>1</id_shop>
    <quantity>${quantity}</quantity>
    <depends_on_stock>0</depends_on_stock>
    <out_of_stock>2</out_of_stock>
  </stock_available>
</prestashop>`

      await psPut<any>(this.creds, `stock_availables/${stock.id}`, xml)
      return true
    } catch (err: any) {
      console.error(`[ps-connector] updateStock error:`, err?.message)
      return false
    }
  }

  // ── Clients ────────────────────────────────────────────────────────────

  private mapCustomer(c: any): CustomerData {
    return {
      id: Number(c.id),
      email: c.email || '',
      firstname: c.firstname || '',
      lastname: c.lastname || '',
      company: c.company || '',
      siret: c.siret || '',
      phone: c.phone || '',
      active: c.active === '1',
      dateAdd: c.date_add || '',
      newsletter: c.newsletter === '1',
    }
  }

  async getCustomer(customerId: number): Promise<CustomerData | null> {
    try {
      const data = await psFetch<any>(this.creds, `customers/${customerId}`, { display: 'full' })
      const c = psExtract(data, 'customer')
      if (!c) return null
      return this.mapCustomer(c)
    } catch (err: any) {
      console.error(`[ps-connector] getCustomer(${customerId}) error:`, err?.message)
      return null
    }
  }

  async updateCustomer(customerId: number, data: Partial<CustomerData>): Promise<CustomerData | null> {
    try {
      // Fetch current customer first
      const current = await psFetch<any>(this.creds, `customers/${customerId}`, { display: 'full' })
      const c = psExtract(current, 'customer')
      if (!c) return null

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <customer>
    <id>${customerId}</id>
    <id_default_group>${c.id_default_group || 3}</id_default_group>
    <id_lang>${c.id_lang || 1}</id_lang>
    <newsletter>${data.newsletter !== undefined ? (data.newsletter ? '1' : '0') : (c.newsletter || '0')}</newsletter>
    <id_gender>${c.id_gender || 0}</id_gender>
    <firstname><![CDATA[${esc(data.firstname || c.firstname)}]]></firstname>
    <lastname><![CDATA[${esc(data.lastname || c.lastname)}]]></lastname>
    <email><![CDATA[${esc(data.email || c.email)}]]></email>
    <passwd><![CDATA[${typeof c.passwd === 'string' ? c.passwd : ''}]]></passwd>
    <active>${c.active || '1'}</active>
    <company><![CDATA[${esc(data.company || c.company || '')}]]></company>
    <siret><![CDATA[${esc(data.siret || c.siret || '')}]]></siret>
    <associations>
      <groups>
        <group><id>${c.id_default_group || 3}</id></group>
      </groups>
    </associations>
  </customer>
</prestashop>`

      await psPut<any>(this.creds, `customers/${customerId}`, xml)
      return this.getCustomer(customerId)
    } catch (err: any) {
      console.error(`[ps-connector] updateCustomer error:`, err?.message)
      return null
    }
  }

  async getCustomers(limit = 50): Promise<CustomerData[]> {
    try {
      const data = await psFetch<{ customers?: any[] }>(this.creds, 'customers', {
        display: 'full',
        limit,
        sort: '[id_DESC]',
      })
      return (data?.customers ?? []).map((c: any) => this.mapCustomer(c))
    } catch (err: any) {
      console.error(`[ps-connector] getCustomers error:`, err?.message)
      return []
    }
  }

  // ── Panier ─────────────────────────────────────────────────────────────

  async createCart(customerId: number): Promise<CartData | null> {
    try {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <cart>
    <id_currency>1</id_currency>
    <id_lang>1</id_lang>
    <id_customer>${customerId}</id_customer>
    <id_shop>1</id_shop>
    <id_shop_group>1</id_shop_group>
    <id_address_delivery>0</id_address_delivery>
    <id_address_invoice>0</id_address_invoice>
  </cart>
</prestashop>`
      const res = await psPost<any>(this.creds, 'carts', xml)
      const cart = psExtract(res, 'cart')
      if (!cart) { console.error(`[ps-connector] createCart: no cart in response`, JSON.stringify(res)?.substring(0, 300)); return null }
      return {
        id: Number(cart.id),
        customerId,
        items: [],
        totalHT: 0, totalTTC: 0, totalTax: 0,
        shippingCost: 0, carrierId: null,
      }
    } catch (err: any) {
      console.error(`[ps-connector] createCart error:`, err?.message)
      return null
    }
  }

  async getCart(cartId: number): Promise<CartData | null> {
    try {
      const data = await psFetch<any>(this.creds, `carts/${cartId}`, { display: 'full' })
      const cart = psExtract(data, 'cart')
      if (!cart) { console.error(`[ps-connector] getCart(${cartId}): no cart in response`, JSON.stringify(data)?.substring(0, 300)); return null }

      const base = psBaseUrl(this.creds)
      const items: CartItemData[] = []
      const cartProducts = cart.associations?.cart_rows ?? []

      for (const row of cartProducts) {
        const productId = Number(row.id_product)
        const combinationId = Number(row.id_product_attribute || 0)
        const quantity = Number(row.quantity || 0)
        if (quantity <= 0) continue

        try {
          const prodData = await psFetch<any>(this.creds, `products/${productId}`, { display: 'full' })
          const p = psExtract(prodData, 'product')
          if (!p) continue

          const priceHT = Number(p.price || 0)
          const taxRate = 0.20 // BACKLOG #142: fetch from tax rules
          const priceTTC = priceHT * (1 + taxRate)
          const imgId = extractImageId(p.id_default_image)

          items.push({
            productId,
            combinationId,
            name: getLang(p.name),
            reference: p.reference || '',
            quantity,
            priceHT,
            priceTTC,
            image: imgId > 0 ? buildImageUrl(base, imgId) : undefined,
          })
        } catch { /* skip broken product */ }
      }

      const totalHT = items.reduce((sum, i) => sum + i.priceHT * i.quantity, 0)
      const totalTTC = items.reduce((sum, i) => sum + i.priceTTC * i.quantity, 0)

      // Applied cart rules (ps_cart_cart_rule) — read from WS associations
      let discountCode: string | undefined
      let discountHT = 0
      const appliedRules = cart.associations?.cart_rules ?? []
      for (const ar of (Array.isArray(appliedRules) ? appliedRules : [])) {
        const ruleId = Number(ar.id_cart_rule ?? ar.id ?? 0)
        if (!ruleId) continue
        try {
          const ruleData = await psFetch<any>(this.creds, `cart_rules/${ruleId}`, { display: 'full' })
          const rule = psExtract(ruleData, 'cart_rule')
          if (!rule || String(rule.active) !== '1') continue
          if (!discountCode && rule.code) discountCode = String(rule.code)
          const reductionPercent = Number(rule.reduction_percent ?? 0)
          const reductionAmount = Number(rule.reduction_amount ?? 0)
          if (reductionPercent > 0) discountHT += (totalHT * reductionPercent) / 100
          else if (reductionAmount > 0) discountHT += reductionAmount
        } catch { /* skip */ }
      }
      discountHT = Math.min(discountHT, totalHT)
      const discountTTC = discountHT * 1.20 // BACKLOG: TVA réelle par ligne

      const finalTotalHT = totalHT - discountHT
      const finalTotalTTC = totalTTC - discountTTC

      return {
        id: cartId,
        customerId: Number(cart.id_customer || 0),
        items,
        totalHT: Math.round(finalTotalHT * 100) / 100,
        totalTTC: Math.round(finalTotalTTC * 100) / 100,
        totalTax: Math.round((finalTotalTTC - finalTotalHT) * 100) / 100,
        shippingCost: 0,
        carrierId: Number(cart.id_carrier) || null,
        ...(discountCode && discountHT > 0 ? {
          discountCode,
          discountHT: Math.round(discountHT * 100) / 100,
          discountTTC: Math.round(discountTTC * 100) / 100,
        } : {}),
      }
    } catch (err: any) {
      console.error(`[ps-connector] getCart(${cartId}) error:`, err?.message)
      return null
    }
  }

  async getLastCustomerCart(customerId: number): Promise<CartData | null> {
    try {
      // Fetch carts for this customer, sorted by id desc (most recent first)
      const data = await psFetch<{ carts?: any[] }>(this.creds, 'carts', {
        'filter[id_customer]': `[${customerId}]`,
        sort: '[id_DESC]',
        limit: '5',
        display: 'full',
      })
      const carts = data?.carts ?? []
      // Find the most recent cart that has items
      for (const c of carts) {
        const rows = c.associations?.cart_rows ?? []
        const hasItems = rows.some((r: any) => Number(r.quantity || 0) > 0)
        if (hasItems) {
          return this.getCart(Number(c.id))
        }
      }
      return null
    } catch (err: any) {
      console.error(`[ps-connector] getLastCustomerCart(${customerId}) error:`, err?.message)
      return null
    }
  }

  async addToCart(cartId: number, productId: number, quantity: number, combinationId = 0): Promise<CartData | null> {
    try {
      // Fetch current cart to get existing rows
      console.log(`[ps-connector] addToCart(cart=${cartId}, product=${productId}, qty=${quantity}, combo=${combinationId})`)
      const current = await psFetch<any>(this.creds, `carts/${cartId}`, { display: 'full' })
      const cart = psExtract(current, 'cart')
      if (!cart) { console.error(`[ps-connector] addToCart: cart missing. Keys:`, Object.keys(current || {})); return null }

      const rows = cart.associations?.cart_rows ?? []
      const existing = rows.find((r: any) => Number(r.id_product) === productId && Number(r.id_product_attribute || 0) === combinationId)
      if (existing) {
        existing.quantity = String(Number(existing.quantity) + quantity)
      } else {
        rows.push({ id_product: String(productId), id_product_attribute: String(combinationId), quantity: String(quantity) })
      }

      const rowsXml = rows.map((r: any) =>
        `<cart_row><id_product>${r.id_product}</id_product><id_product_attribute>${r.id_product_attribute || 0}</id_product_attribute><quantity>${r.quantity}</quantity></cart_row>`
      ).join('\n        ')

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <cart>
    <id>${cartId}</id>
    <id_currency>${cart.id_currency || 1}</id_currency>
    <id_lang>${cart.id_lang || 1}</id_lang>
    <id_customer>${cart.id_customer}</id_customer>
    <id_shop>${cart.id_shop || 1}</id_shop>
    <id_shop_group>${cart.id_shop_group || 1}</id_shop_group>
    <id_address_delivery>${cart.id_address_delivery || 0}</id_address_delivery>
    <id_address_invoice>${cart.id_address_invoice || 0}</id_address_invoice>
    <associations>
      <cart_rows>
        ${rowsXml}
      </cart_rows>
    </associations>
  </cart>
</prestashop>`

      await psPut<any>(this.creds, `carts/${cartId}`, xml)
      return this.getCart(cartId)
    } catch (err: any) {
      console.error(`[ps-connector] addToCart error:`, err?.message)
      return null
    }
  }

  async updateCartItem(cartId: number, productId: number, quantity: number, combinationId = 0): Promise<CartData | null> {
    try {
      const current = await psFetch<any>(this.creds, `carts/${cartId}`, { display: 'full' })
      const cart = psExtract(current, 'cart')
      if (!cart) { console.error(`[ps-connector] updateCartItem: cart missing`); return null }

      let rows = cart.associations?.cart_rows ?? []
      const idx = rows.findIndex((r: any) => Number(r.id_product) === productId && Number(r.id_product_attribute || 0) === combinationId)

      if (quantity <= 0) {
        if (idx >= 0) rows.splice(idx, 1)
      } else if (idx >= 0) {
        rows[idx].quantity = String(quantity)
      } else {
        rows.push({ id_product: String(productId), id_product_attribute: String(combinationId), quantity: String(quantity) })
      }

      const rowsXml = rows.map((r: any) =>
        `<cart_row><id_product>${r.id_product}</id_product><id_product_attribute>${r.id_product_attribute || 0}</id_product_attribute><quantity>${r.quantity}</quantity></cart_row>`
      ).join('\n        ')

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <cart>
    <id>${cartId}</id>
    <id_currency>${cart.id_currency || 1}</id_currency>
    <id_lang>${cart.id_lang || 1}</id_lang>
    <id_customer>${cart.id_customer}</id_customer>
    <id_shop>${cart.id_shop || 1}</id_shop>
    <id_shop_group>${cart.id_shop_group || 1}</id_shop_group>
    <id_address_delivery>${cart.id_address_delivery || 0}</id_address_delivery>
    <id_address_invoice>${cart.id_address_invoice || 0}</id_address_invoice>
    <associations>
      <cart_rows>
        ${rowsXml}
      </cart_rows>
    </associations>
  </cart>
</prestashop>`

      await psPut<any>(this.creds, `carts/${cartId}`, xml)
      return this.getCart(cartId)
    } catch (err: any) {
      console.error(`[ps-connector] updateCartItem error:`, err?.message)
      return null
    }
  }

  async removeFromCart(cartId: number, productId: number, combinationId = 0): Promise<boolean> {
    const result = await this.updateCartItem(cartId, productId, 0, combinationId)
    return result !== null
  }

  // ── Adresses ──────────────────────────────────────────────────────────

  async getAddresses(customerId: number): Promise<AddressData[]> {
    try {
      const data = await psFetch<{ addresses?: any[] }>(this.creds, 'addresses', {
        'filter[id_customer]': `[${customerId}]`,
        'filter[deleted]': '[0]',
        display: 'full',
      })
      return (data?.addresses ?? []).map((a: any) => ({
        id: Number(a.id),
        customerId: Number(a.id_customer),
        alias: getLang(a.alias) || 'Adresse',
        company: a.company || '',
        firstname: a.firstname,
        lastname: a.lastname,
        address1: a.address1,
        address2: a.address2 || '',
        postcode: a.postcode || '',
        city: a.city,
        countryId: Number(a.id_country || 8), // 8 = France
        phone: a.phone || a.phone_mobile || '',
        vatNumber: a.vat_number || '',
      }))
    } catch (err: any) {
      console.error(`[ps-connector] getAddresses error:`, err?.message)
      return []
    }
  }

  async createAddress(data: AddressData): Promise<AddressData | null> {
    try {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <address>
    <id_customer>${data.customerId}</id_customer>
    <id_country>${data.countryId || 8}</id_country>
    <alias><![CDATA[${esc(data.alias || 'Adresse')}]]></alias>
    <company><![CDATA[${esc(data.company || '')}]]></company>
    <firstname><![CDATA[${esc(data.firstname)}]]></firstname>
    <lastname><![CDATA[${esc(data.lastname)}]]></lastname>
    <address1><![CDATA[${esc(data.address1)}]]></address1>
    <address2><![CDATA[${esc(data.address2 || '')}]]></address2>
    <postcode><![CDATA[${esc(data.postcode)}]]></postcode>
    <city><![CDATA[${esc(data.city)}]]></city>
    <phone><![CDATA[${esc(data.phone || '')}]]></phone>
    <vat_number><![CDATA[${esc(data.vatNumber || '')}]]></vat_number>
  </address>
</prestashop>`

      const res = await psPost<any>(this.creds, 'addresses', xml)
      const addr = psExtract(res, 'address')
      if (!addr) { console.error(`[ps-connector] createAddress: no address in response`, JSON.stringify(res)?.substring(0, 300)); return null }
      return { ...data, id: Number(addr.id) }
    } catch (err: any) {
      console.error(`[ps-connector] createAddress error:`, err?.message)
      return null
    }
  }

  async updateAddress(addressId: number, data: Partial<AddressData>): Promise<AddressData | null> {
    try {
      // Fetch current address first
      console.log(`[ps-connector] updateAddress(${addressId}) data:`, JSON.stringify(data)?.substring(0, 200))
      const current = await psFetch<any>(this.creds, `addresses/${addressId}`, { display: 'full' })
      const addr = psExtract(current, 'address')
      if (!addr) { console.error(`[ps-connector] updateAddress: address missing. Keys:`, Object.keys(current || {})); return null }

      const deleted = (data as any).deleted ? '1' : (addr.deleted ?? '0')

      const merged = {
        id_customer: data.customerId ?? addr.id_customer,
        id_country: data.countryId ?? addr.id_country ?? 8,
        alias: data.alias ?? addr.alias ?? 'Adresse',
        company: data.company ?? addr.company ?? '',
        firstname: data.firstname ?? addr.firstname,
        lastname: data.lastname ?? addr.lastname,
        address1: data.address1 ?? addr.address1,
        address2: data.address2 ?? addr.address2 ?? '',
        postcode: data.postcode ?? addr.postcode ?? '',
        city: data.city ?? addr.city,
        phone: data.phone ?? addr.phone ?? '',
        vat_number: data.vatNumber ?? addr.vat_number ?? '',
      }

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <address>
    <id>${addressId}</id>
    <id_customer>${merged.id_customer}</id_customer>
    <id_country>${merged.id_country}</id_country>
    <alias><![CDATA[${esc(String(merged.alias))}]]></alias>
    <company><![CDATA[${esc(merged.company)}]]></company>
    <firstname><![CDATA[${esc(merged.firstname)}]]></firstname>
    <lastname><![CDATA[${esc(merged.lastname)}]]></lastname>
    <address1><![CDATA[${esc(merged.address1)}]]></address1>
    <address2><![CDATA[${esc(merged.address2)}]]></address2>
    <postcode><![CDATA[${esc(merged.postcode)}]]></postcode>
    <city><![CDATA[${esc(merged.city)}]]></city>
    <phone><![CDATA[${esc(merged.phone)}]]></phone>
    <vat_number><![CDATA[${esc(merged.vat_number)}]]></vat_number>
    <deleted>${deleted}</deleted>
  </address>
</prestashop>`

      await psPut<any>(this.creds, `addresses/${addressId}`, xml)
      return {
        id: addressId,
        customerId: Number(merged.id_customer),
        alias: String(merged.alias),
        company: merged.company,
        firstname: merged.firstname,
        lastname: merged.lastname,
        address1: merged.address1,
        address2: merged.address2,
        postcode: merged.postcode,
        city: merged.city,
        countryId: Number(merged.id_country),
        phone: merged.phone,
        vatNumber: merged.vat_number,
      }
    } catch (err: any) {
      console.error(`[ps-connector] updateAddress error:`, err?.message)
      return null
    }
  }

  // ── Pays actifs ─────────────────────────────────────────────────────

  async getCountries(): Promise<{ id: number; name: string }[]> {
    try {
      const data = await psFetch<any>(this.creds, 'countries', {
        'filter[active]': '1',
        display: '[id,name]',
      })
      const list = Array.isArray(data?.countries) ? data.countries : []
      return list.map((c: any) => ({
        id: Number(c.id),
        name: typeof c.name === 'object' ? (c.name?.language ?? c.name) : String(c.name),
      })).sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, 'fr'))
    } catch (err) {
      console.error('[PS] getCountries error:', err)
      return []
    }
  }

  // ── Transporteurs ─────────────────────────────────────────────────────

  async getCarriers(): Promise<CarrierData[]> {
    try {
      const data = await psFetch<{ carriers?: any[] }>(this.creds, 'carriers', {
        'filter[active]': '[1]',
        'filter[deleted]': '[0]',
        display: 'full',
      })
      // Fetch delivery prices (real cost per carrier/zone)
      let deliveryPrices: Record<number, number> = {}
      try {
        const delData = await psFetch<{ deliveries?: any[] }>(this.creds, 'deliveries', { display: 'full' })
        for (const d of delData?.deliveries ?? []) {
          const cid = Number(d.id_carrier)
          const price = Number(d.price || 0)
          // Keep the highest price for each carrier (covers all zones)
          if (!deliveryPrices[cid] || price > deliveryPrices[cid]) {
            deliveryPrices[cid] = price
          }
        }
      } catch { /* delivery fetch failed, fallback to 0 */ }

      return (data?.carriers ?? []).map((c: any) => {
        const id = Number(c.id)
        return {
          id,
          name: getLang(c.name) || c.name || '',
          delay: getLang(c.delay) || '',
          price: c.is_free === '1' ? 0 : (deliveryPrices[id] ?? 0),
          freeAbove: null,
          active: c.active === '1',
        }
      })
    } catch (err: any) {
      console.error(`[ps-connector] getCarriers error:`, err?.message)
      return []
    }
  }

  // ── Commandes ─────────────────────────────────────────────────────────

  async createOrder(data: OrderInput): Promise<OrderData | null> {
    try {
      // 1. Update the cart with the address (PrestaShop requires id_address_delivery > 0 for validateOrder)
      try {
        const cartData = await psFetch<any>(this.creds, `carts/${data.cartId}`, { display: 'full' })
        const rawCart = psExtract(cartData, 'cart')
        if (rawCart) {
          const rows = rawCart.associations?.cart_rows ?? []
          const rowsXml = rows.map((r: any) =>
            `<cart_row><id_product>${r.id_product}</id_product><id_product_attribute>${r.id_product_attribute || 0}</id_product_attribute><quantity>${r.quantity}</quantity></cart_row>`
          ).join('\n        ')
          const cartXml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <cart>
    <id>${data.cartId}</id>
    <id_currency>${rawCart.id_currency || 1}</id_currency>
    <id_lang>${rawCart.id_lang || 1}</id_lang>
    <id_customer>${rawCart.id_customer}</id_customer>
    <id_shop>1</id_shop>
    <id_shop_group>1</id_shop_group>
    <id_address_delivery>${data.addressDeliveryId}</id_address_delivery>
    <id_address_invoice>${data.addressInvoiceId || data.addressDeliveryId}</id_address_invoice>
    <id_carrier>${data.carrierId || 0}</id_carrier>
    <associations>
      <cart_rows>
        ${rowsXml}
      </cart_rows>
    </associations>
  </cart>
</prestashop>`
          await psPut<any>(this.creds, `carts/${data.cartId}`, cartXml)
          console.log(`[ps-connector] createOrder: cart ${data.cartId} updated with address=${data.addressDeliveryId} carrier=${data.carrierId}`)
        }
      } catch (err: any) {
        console.warn(`[ps-connector] createOrder: cart address update failed:`, err?.message)
      }

      // 2. Fetch cart to compute totals
      const cart = await this.getCart(data.cartId)
      if (!cart || !cart.items.length) {
        console.error('[ps-connector] createOrder: cart empty or not found')
        return null
      }

      // Generate a unique reference + retrieve the customer's secure_key (via the cart)
      const ref = Math.random().toString(36).substring(2, 11).toUpperCase()
      const cartRaw = await psFetch<any>(this.creds, `carts/${data.cartId}`, { display: 'full' })
      const cartObj = psExtract(cartRaw, 'cart')
      const secureKey = cartObj?.secure_key || (await import('node:crypto')).randomBytes(16).toString('hex').slice(0, 32)

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <order>
    <id_address_delivery>${data.addressDeliveryId}</id_address_delivery>
    <id_address_invoice>${data.addressInvoiceId}</id_address_invoice>
    <id_cart>${data.cartId}</id_cart>
    <id_currency>1</id_currency>
    <id_lang>1</id_lang>
    <id_customer>${data.customerId}</id_customer>
    <id_carrier>${data.carrierId}</id_carrier>
    <id_shop>1</id_shop>
    <id_shop_group>1</id_shop_group>
    <current_state>${data.paymentMethod?.includes('SystemPay') ? 14 : 10}</current_state>
    <module><![CDATA[${esc(data.paymentModule || 'ps_wirepayment')}]]></module>
    <payment><![CDATA[${esc(data.paymentMethod || 'Virement bancaire')}]]></payment>
    <total_paid>${cart.totalTTC.toFixed(6)}</total_paid>
    <total_paid_tax_incl>${cart.totalTTC.toFixed(6)}</total_paid_tax_incl>
    <total_paid_tax_excl>${cart.totalHT.toFixed(6)}</total_paid_tax_excl>
    <total_paid_real>0.000000</total_paid_real>
    <total_products>${cart.totalHT.toFixed(6)}</total_products>
    <total_products_wt>${cart.totalTTC.toFixed(6)}</total_products_wt>
    <total_shipping>${cart.shippingCost.toFixed(6)}</total_shipping>
    <total_shipping_tax_incl>${cart.shippingCost.toFixed(6)}</total_shipping_tax_incl>
    <total_shipping_tax_excl>${cart.shippingCost.toFixed(6)}</total_shipping_tax_excl>
    <total_discounts>0.000000</total_discounts>
    <total_discounts_tax_incl>0.000000</total_discounts_tax_incl>
    <total_discounts_tax_excl>0.000000</total_discounts_tax_excl>
    <conversion_rate>1.000000</conversion_rate>
    <reference><![CDATA[${ref}]]></reference>
    <secure_key><![CDATA[${secureKey}]]></secure_key>
    <associations>
      <order_rows>
        ${cart.items.map(item => `<order_row>
          <product_id>${item.productId}</product_id>
          <product_attribute_id>${item.combinationId || 0}</product_attribute_id>
          <product_quantity>${item.quantity}</product_quantity>
        </order_row>`).join('\n        ')}
      </order_rows>
    </associations>
  </order>
</prestashop>`

      console.log(`[ps-connector] createOrder XML: cart=${data.cartId} customer=${data.customerId} addr=${data.addressDeliveryId} carrier=${data.carrierId} items=${cart.items.length} totalTTC=${cart.totalTTC}`)
      const res = await psPost<any>(this.creds, 'orders', xml)
      const order = psExtract(res, 'order')
      if (!order) { console.error(`[ps-connector] createOrder: no order in response`, JSON.stringify(res)?.substring(0, 500)); return null }

      return {
        id: Number(order.id),
        reference: order.reference || ref,
        customerId: data.customerId,
        status: 'En attente de paiement',
        statusId: 1,
        payment: data.paymentMethod || 'Virement bancaire',
        totalPaidHT: cart.totalHT,
        totalPaidTTC: cart.totalTTC,
        totalShipping: cart.shippingCost,
        totalProducts: cart.totalHT,
        items: cart.items.map(i => ({
          productId: i.productId,
          name: i.name,
          reference: i.reference,
          quantity: i.quantity,
          priceHT: i.priceHT,
          priceTTC: i.priceTTC,
        })),
        dateAdd: new Date().toISOString(),
      }
    } catch (err: any) {
      console.error(`[ps-connector] createOrder error:`, err?.message)
      return null
    }
  }

  async getOrders(customerId: number, limit = 20): Promise<OrderData[]> {
    try {
      const data = await psFetch<{ orders?: any[] }>(this.creds, 'orders', {
        'filter[id_customer]': `[${customerId}]`,
        display: 'full',
        limit,
        sort: '[id_DESC]',
      })

      const statuses = await this.getOrderStatuses()
      const statusMap = new Map(statuses.map(s => [s.id, s]))

      return (data?.orders ?? []).map((o: any) => {
        const statusId = Number(o.current_state || 0)
        const status = statusMap.get(statusId)

        const items: OrderItemData[] = (o.associations?.order_rows ?? []).map((row: any) => ({
          productId: Number(row.product_id),
          name: row.product_name || '',
          reference: row.product_reference || '',
          quantity: Number(row.product_quantity || 0),
          priceHT: Number(row.unit_price_tax_excl || row.product_price || 0),
          priceTTC: Number(row.unit_price_tax_incl || row.product_price || 0),
        }))

        return {
          id: Number(o.id),
          reference: o.reference || '',
          customerId: Number(o.id_customer),
          status: status?.name || `État #${statusId}`,
          statusId,
          payment: o.payment || '',
          totalPaidHT: Number(o.total_paid_tax_excl || 0),
          totalPaidTTC: Number(o.total_paid_tax_incl || 0),
          totalShipping: Number(o.total_shipping_tax_incl || 0),
          totalProducts: Number(o.total_products || 0),
          items,
          dateAdd: o.date_add || '',
          invoiceNumber: o.invoice_number && o.invoice_number !== '0' ? o.invoice_number : undefined,
          invoiceDate: o.invoice_date && o.invoice_date !== '0000-00-00 00:00:00' ? o.invoice_date : undefined,
        }
      })
    } catch (err: any) {
      console.error(`[ps-connector] getOrders error:`, err?.message)
      return []
    }
  }

  async getOrder(orderId: number): Promise<OrderData | null> {
    try {
      const data = await psFetch<any>(this.creds, `orders/${orderId}`, { display: 'full' })
      const o = psExtract(data, 'order')
      if (!o) return null

      const statuses = await this.getOrderStatuses()
      const statusId = Number(o.current_state || 0)
      const status = statuses.find(s => s.id === statusId)

      const items: OrderItemData[] = (o.associations?.order_rows ?? []).map((row: any) => ({
        productId: Number(row.product_id),
        name: row.product_name || '',
        reference: row.product_reference || '',
        quantity: Number(row.product_quantity || 0),
        priceHT: Number(row.unit_price_tax_excl || row.product_price || 0),
        priceTTC: Number(row.unit_price_tax_incl || row.product_price || 0),
      }))

      // Fetch addresses
      let addressDelivery: AddressData | undefined
      let addressInvoice: AddressData | undefined
      try {
        const addrs = await this.getAddresses(Number(o.id_customer))
        addressDelivery = addrs.find(a => a.id === Number(o.id_address_delivery))
        addressInvoice = addrs.find(a => a.id === Number(o.id_address_invoice))
      } catch { /* ignore */ }

      return {
        id: Number(o.id),
        reference: o.reference || '',
        customerId: Number(o.id_customer),
        status: status?.name || `État #${statusId}`,
        statusId,
        payment: o.payment || '',
        totalPaidHT: Number(o.total_paid_tax_excl || 0),
        totalPaidTTC: Number(o.total_paid_tax_incl || 0),
        totalShipping: Number(o.total_shipping_tax_incl || 0),
        totalProducts: Number(o.total_products || 0),
        items,
        dateAdd: o.date_add || '',
        addressDelivery,
        addressInvoice,
        invoiceNumber: o.invoice_number && o.invoice_number !== '0' ? o.invoice_number : undefined,
        invoiceDate: o.invoice_date && o.invoice_date !== '0000-00-00 00:00:00' ? o.invoice_date : undefined,
      }
    } catch (err: any) {
      console.error(`[ps-connector] getOrder(${orderId}) error:`, err?.message)
      return null
    }
  }

  async getOrderStatuses(): Promise<OrderStatusData[]> {
    try {
      const data = await psFetch<{ order_states?: any[] }>(this.creds, 'order_states', {
        display: 'full',
      })
      return (data?.order_states ?? []).map((s: any) => ({
        id: Number(s.id),
        name: getLang(s.name) || `État #${s.id}`,
        color: s.color || '#888888',
      }))
    } catch (err: any) {
      console.error(`[ps-connector] getOrderStatuses error:`, err?.message)
      return []
    }
  }

  async getOrderHistory(orderId: number): Promise<OrderHistoryEntry[]> {
    try {
      const data = await psFetch<{ order_histories?: any[] }>(this.creds, 'order_histories', {
        'filter[id_order]': `[${orderId}]`,
        display: 'full',
        sort: '[date_add_DESC]',
      })

      const statuses = await this.getOrderStatuses()
      const statusMap = new Map(statuses.map(s => [s.id, s]))

      return (data?.order_histories ?? []).map((h: any) => {
        const sId = Number(h.id_order_state || 0)
        const status = statusMap.get(sId)
        return {
          id: Number(h.id),
          statusId: sId,
          statusName: status?.name || `État #${sId}`,
          dateAdd: h.date_add || '',
        }
      })
    } catch (err: any) {
      console.error(`[ps-connector] getOrderHistory error:`, err?.message)
      return []
    }
  }

  async getRevenueStats(): Promise<RevenueStats> {
    try {
      // Fetch all orders (limited to recent 500)
      const data = await psFetch<{ orders?: any[] }>(this.creds, 'orders', {
        display: '[id,total_paid_tax_incl,total_products,date_add,current_state]',
        limit: 500,
        sort: '[id_DESC]',
      })

      const orders = data?.orders ?? []
      const now = new Date()
      const todayStr = now.toISOString().slice(0, 10)
      const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10)
      const monthAgo = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10)

      let today = 0, week = 0, month = 0, total = 0
      let ordersToday = 0, ordersWeek = 0, ordersMonth = 0

      for (const o of orders) {
        const amount = Number(o.total_paid_tax_incl || 0)
        const date = (o.date_add || '').slice(0, 10)
        total += amount

        if (date >= todayStr) { today += amount; ordersToday++ }
        if (date >= weekAgo) { week += amount; ordersWeek++ }
        if (date >= monthAgo) { month += amount; ordersMonth++ }
      }

      const round = (n: number) => Math.round(n * 100) / 100

      return {
        today: round(today), week: round(week), month: round(month), total: round(total),
        ordersToday, ordersWeek, ordersMonth, ordersTotal: orders.length,
        avgOrderValue: orders.length ? round(total / orders.length) : 0,
      }
    } catch (err: any) {
      console.error(`[ps-connector] getRevenueStats error:`, err?.message)
      return { today: 0, week: 0, month: 0, total: 0, ordersToday: 0, ordersWeek: 0, ordersMonth: 0, ordersTotal: 0, avgOrderValue: 0 }
    }
  }

  async getTopProducts(limit = 10): Promise<TopProduct[]> {
    try {
      // Fetch order details to aggregate
      const data = await psFetch<{ orders?: any[] }>(this.creds, 'orders', {
        display: 'full',
        limit: 200,
        sort: '[id_DESC]',
      })

      const productMap = new Map<number, TopProduct>()
      for (const o of data?.orders ?? []) {
        for (const row of o.associations?.order_rows ?? []) {
          const pId = Number(row.product_id)
          const qty = Number(row.product_quantity || 0)
          const revenue = Number(row.unit_price_tax_incl || row.product_price || 0) * qty
          const existing = productMap.get(pId)
          if (existing) {
            existing.quantity += qty
            existing.revenue += revenue
          } else {
            productMap.set(pId, {
              productId: pId,
              name: row.product_name || `Produit #${pId}`,
              quantity: qty,
              revenue,
            })
          }
        }
      }

      return [...productMap.values()]
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, limit)
        .map(p => ({ ...p, revenue: Math.round(p.revenue * 100) / 100 }))
    } catch (err: any) {
      console.error(`[ps-connector] getTopProducts error:`, err?.message)
      return []
    }
  }

  async updateOrderStatus(orderId: number, statusId: number): Promise<boolean> {
    try {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <order_history>
    <id_order>${orderId}</id_order>
    <id_order_state>${statusId}</id_order_state>
  </order_history>
</prestashop>`
      await psPost<any>(this.creds, 'order_histories', xml)
      return true
    } catch (err: any) {
      console.error(`[ps-connector] updateOrderStatus error:`, err?.message)
      return false
    }
  }
}
