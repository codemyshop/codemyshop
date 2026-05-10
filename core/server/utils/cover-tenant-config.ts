import { getPgClient } from './db-pg-adapter'

export type CoverTenantConfig = {
  tenant: string
  siteUrl: string
  masqueFilename: string | null
  preColor: string
  mainColor: string
  gradientRgb: [number, number, number]
  accentColor: string
  subtitleColor: string
  ctaColor: string
  brand: string
}

const FALLBACK_TENANT = 'ac-hub'
const cache = new Map<string, CoverTenantConfig>()

export async function getCoverTenantConfig(tenant: string): Promise<CoverTenantConfig> {
  const key = tenant || FALLBACK_TENANT
  if (cache.has(key)) return cache.get(key)!

  type Row = {
    tenant: string
    site_url: string
    masque_filename: string | null
    pre_color: string
    main_color: string
    gradient_r: number
    gradient_g: number
    gradient_b: number
    accent_color: string
    subtitle_color: string
    cta_color: string
    brand: string
  }
  const sql = getPgClient()
  const rows = await sql<Row[]>`
    SELECT tenant, site_url, masque_filename, pre_color, main_color,
           gradient_r, gradient_g, gradient_b,
           accent_color, subtitle_color, cta_color, brand
    FROM cs_main.cs_cover_tenant_config
    WHERE tenant = ${key} AND active = 1
    LIMIT 1
  `

  let row = rows[0]
  if (!row && key !== FALLBACK_TENANT) {
    const fallback = await sql<Row[]>`
      SELECT tenant, site_url, masque_filename, pre_color, main_color,
             gradient_r, gradient_g, gradient_b,
             accent_color, subtitle_color, cta_color, brand
      FROM cs_main.cs_cover_tenant_config
      WHERE tenant = ${FALLBACK_TENANT} AND active = 1
      LIMIT 1
    `
    row = fallback[0]
  }
  if (!row) throw new Error(`getCoverTenantConfig: no config for ${key} nor ${FALLBACK_TENANT}`)

  const cfg: CoverTenantConfig = {
    tenant: row.tenant,
    siteUrl: row.site_url,
    masqueFilename: row.masque_filename,
    preColor: row.pre_color,
    mainColor: row.main_color,
    gradientRgb: [row.gradient_r, row.gradient_g, row.gradient_b],
    accentColor: row.accent_color,
    subtitleColor: row.subtitle_color,
    ctaColor: row.cta_color,
    brand: row.brand,
  }
  cache.set(key, cfg)
  return cfg
}

export function clearCoverTenantConfigCache(): void {
  cache.clear()
}
