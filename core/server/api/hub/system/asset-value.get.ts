

import { useClientDb } from '~/server/utils/db'
import { resolveClientId } from '~/server/utils/db'
import { getClientConfigJson } from '~/internal/clientconfig/server/utils/clientconfig'
import { getTotalTraffic } from '~/server/services/gsc'

interface AssetValueComponents {
  
  codeValue: number
  
  catalogValue: number
  activeSkus: number
  
  customersValue: number
  activeCustomers12m: number
  dormantContacts: number
  
  seoValue: number
  gscClicks12m: number
  hasGsc: boolean
}

interface AssetValueResult {
  total: number             
  components: AssetValueComponents
  
  params: {
    codeBase: number
    catalogPerSku: number
    activeCustomerValue: number
    dormantContactValue: number
    cpcEur: number
    seoMultiplier: number
    noSeoFallback: number
  }
}

const DEFAULT_CODE_BASE = 50_000           
const DEFAULT_CATALOG_PER_SKU = 5          
const DEFAULT_ACTIVE_CUSTOMER = 30         
const DEFAULT_DORMANT_CONTACT = 3          
const DEFAULT_CPC_EUR = 0.40               
const DEFAULT_SEO_MULTIPLIER = 0.5         
const DEFAULT_NO_SEO_FALLBACK = 5_000      

function parseFloatSafe(raw: string | undefined, fallback: number, min = 0, max = 1_000_000): number {
  if (!raw) return fallback
  const v = parseFloat(raw.replace(',', '.'))
  if (!Number.isFinite(v) || v < min || v > max) return fallback
  return v
}

async function resolveTenantSiteUrl(event: any): Promise<string> {
  try {
    const clientId = resolveClientId(event)
    const json = await getClientConfigJson(clientId, { event })
    if (!json) return ''
    const config = JSON.parse(json)
    return typeof config?.gscSiteUrl === 'string' ? config.gscSiteUrl : ''
  } catch {
    return ''
  }
}

export default defineEventHandler(async (event): Promise<AssetValueResult> => {
  const db = useClientDb(event)

  
  const configRows = await db.query<{ name: string; value: string }>(
    `SELECT name, value FROM ps_configuration
      WHERE name IN (
        'AC_VALUATION_CODE_EUR',
        'AC_VALUATION_CATALOG_PER_SKU_EUR',
        'AC_VALUATION_ACTIVE_CUSTOMER_EUR',
        'AC_VALUATION_DORMANT_CONTACT_EUR',
        'AC_VALUATION_CPC_EUR',
        'AC_VALUATION_SEO_MULTIPLIER',
        'AC_VALUATION_NO_SEO_FALLBACK_EUR'
      )`,
  ).catch(() => [])
  const cfg = new Map(configRows.map(r => [r.name, r.value]))

  const codeBase = parseFloatSafe(cfg.get('AC_VALUATION_CODE_EUR'), DEFAULT_CODE_BASE, 0, 5_000_000)
  const catalogPerSku = parseFloatSafe(cfg.get('AC_VALUATION_CATALOG_PER_SKU_EUR'), DEFAULT_CATALOG_PER_SKU, 0, 1000)
  const activeCustomerValue = parseFloatSafe(cfg.get('AC_VALUATION_ACTIVE_CUSTOMER_EUR'), DEFAULT_ACTIVE_CUSTOMER, 0, 1000)
  const dormantContactValue = parseFloatSafe(cfg.get('AC_VALUATION_DORMANT_CONTACT_EUR'), DEFAULT_DORMANT_CONTACT, 0, 1000)
  const cpcEur = parseFloatSafe(cfg.get('AC_VALUATION_CPC_EUR'), DEFAULT_CPC_EUR, 0, 50)
  const seoMultiplier = parseFloatSafe(cfg.get('AC_VALUATION_SEO_MULTIPLIER'), DEFAULT_SEO_MULTIPLIER, 0, 10)
  const noSeoFallback = parseFloatSafe(cfg.get('AC_VALUATION_NO_SEO_FALLBACK_EUR'), DEFAULT_NO_SEO_FALLBACK, 0, 100_000)

  
  const [skuRows, customerRows] = await Promise.all([
    db.query<{ active_skus: string }>(
      `SELECT COUNT(*)::text AS active_skus FROM ps_product WHERE active = 1`,
    ).catch(() => []),
    db.query<{ total_customers: string; active_customers_12m: string }>(
      `SELECT
         (SELECT COUNT(*) FROM ps_customer WHERE active = 1)::text AS total_customers,
         (SELECT COUNT(DISTINCT id_customer) FROM ps_orders
            WHERE date_add >= NOW() - INTERVAL '12 months'
              AND current_state IN (2, 3, 4, 5, 10, 14))::text AS active_customers_12m`,
    ).catch(() => []),
  ])

  const activeSkus = Number(skuRows[0]?.active_skus ?? 0)
  const totalCustomers = Number(customerRows[0]?.total_customers ?? 0)
  const activeCustomers12m = Number(customerRows[0]?.active_customers_12m ?? 0)
  const dormantContacts = Math.max(0, totalCustomers - activeCustomers12m)

  
  const siteUrl = await resolveTenantSiteUrl(event)
  const traffic = siteUrl
    ? await getTotalTraffic(siteUrl, 365)
    : { clicks: 0, impressions: 0, days: 365 }
  const hasGsc = !!siteUrl && traffic.clicks > 0

  
  const codeValue = codeBase
  const catalogValue = activeSkus * catalogPerSku
  const customersValue = activeCustomers12m * activeCustomerValue
                       + dormantContacts * dormantContactValue
  const seoValue = hasGsc
    ? Math.round(traffic.clicks * cpcEur * seoMultiplier)
    : noSeoFallback

  const total = Math.round(codeValue + catalogValue + customersValue + seoValue)

  return {
    total,
    components: {
      codeValue: Math.round(codeValue),
      catalogValue: Math.round(catalogValue),
      activeSkus,
      customersValue: Math.round(customersValue),
      activeCustomers12m,
      dormantContacts,
      seoValue: Math.round(seoValue),
      gscClicks12m: traffic.clicks,
      hasGsc,
    },
    params: {
      codeBase,
      catalogPerSku,
      activeCustomerValue,
      dormantContactValue,
      cpcEur,
      seoMultiplier,
      noSeoFallback,
    },
  }
})
