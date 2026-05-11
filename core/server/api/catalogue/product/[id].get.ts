

import { useClientDb, useClientDbById } from '~/server/utils/db'
import { buildProductImage } from '~/server/utils/ps-image'
import { localizeRootSegment } from '~/utils/locale-route-roots'
import { buildCategoryPathMap, buildProductUrlFromCategory } from '~/server/utils/category-path'
import { resolveTenantPiliers } from '~/server/utils/tenant-piliers'
import { getFoodFullForProduct } from '~/enterprise/vertical-food/product-food/server/utils/product-food'
import { isTenantB2b, buildTaxJoinForPrice, buildPriceExprNonAgg } from '~/server/utils/ps-tax'
import {
  applySpecificPrice,
  getActiveSpecificPrices,
  specificPriceLabel,
} from '~/server/utils/specific-price'
import { deriveUnitPricing } from '~/server/utils/unity-label'
import { tenantHasUnitPricing } from '~/server/utils/tenant-vertical'

function parseWeightToKg(s: string | null | undefined): number | null {
  if (!s) return null
  const m = String(s).trim().toLowerCase().replace(',', '.').match(/^([\d.]+)\s*(kg|g)$/)
  if (!m) return null
  const n = Number(m[1])
  if (!Number.isFinite(n) || n <= 0) return null
  return m[2] === 'kg' ? n : n / 1000
}

interface AttachmentRow {
  id: number
  name: string
  fileName: string
  mime: string
  fileSize: number
}

interface ProductSpec {
  designation?: string | null
  countryOrigin?: string | null
  processProduction?: string | null
  caliberDetail?: string | null
  ingredients?: Array<{ name: string; pct?: number; origin?: string | null }>
  allergens?: string[]
  nutri?: {
    energyKj?: number | null
    energyKcal?: number | null
    fatG?: number | null
    satFatG?: number | null
    carbsG?: number | null
    sugarsG?: number | null
    proteinsG?: number | null
    saltG?: number | null
  }
  compliance?: { isIonised: boolean | null; hasNanomaterials: boolean | null; isNonGmo: boolean | null }
  sensory?: Record<string, string>
  shelfLifeMonths?: number | null
  storageTemperature?: string | null
  storageHumidity?: string | null
  usageConditions?: string | null
  consumerWarnings?: string | null
  pack?: {
    container?: string | null
    unitWeight?: string | null
    unitsPerCarton?: number | null
    cartonWeight?: string | null
    cartonsPerPallet?: number | null
    material?: string | null
  }
}

function parseJsonField<T>(raw: unknown): T | null {
  if (!raw) return null
  if (typeof raw === 'object') return raw as T
  try { return JSON.parse(String(raw)) as T } catch { return null }
}

async function hydrateSpecFromDb(event: any, productId: number, idLang: number): Promise<ProductSpec | null> {
  try {
    const r = await getFoodFullForProduct(productId, idLang, { event })
    if (!r) return null
    const spec: ProductSpec = {
      designation: r.designation,
      countryOrigin: r.countryOrigin,
      processProduction: r.processProduction,
      caliberDetail: r.caliber,
      ingredients: parseJsonField<any[]>(r.ingredientsJson) || undefined,
      allergens: parseJsonField<string[]>(r.allergensJson) || undefined,
      sensory: parseJsonField<Record<string, string>>(r.sensoryJson) || undefined,
      nutri: {
        energyKj: r.nutEnergyKj,
        energyKcal: r.nutEnergyKcal,
        fatG: r.nutFatG,
        satFatG: r.nutSatFatG,
        carbsG: r.nutCarbsG,
        sugarsG: r.nutSugarsG,
        proteinsG: r.nutProteinsG,
        saltG: r.nutSaltG,
      },
      compliance: {
        isIonised: r.isIonised != null ? !!r.isIonised : null,
        hasNanomaterials: r.hasNanomaterials != null ? !!r.hasNanomaterials : null,
        isNonGmo: r.isNonGmo != null ? !!r.isNonGmo : null,
      },
      shelfLifeMonths: r.shelfLifeMonths,
      storageTemperature: r.storageTemperature,
      storageHumidity: r.storageHumidity,
      usageConditions: r.usageConditions,
      consumerWarnings: r.consumerWarnings,
      pack: {
        container: r.packContainer,
        unitWeight: r.packUnitWeight,
        unitsPerCarton: r.packUnitsPerCarton,
        cartonWeight: r.packCartonWeight,
        cartonsPerPallet: r.packCartonsPerPallet,
        material: r.packMaterial,
      },
    }
    return spec
  } catch (err: any) {
    if (err?.code === 'ER_NO_SUCH_TABLE' || err?.errno === 1146) return null
    console.warn('[product/:id] hydrate spec failed:', err?.message)
    return null
  }
}

async function hydrateAttachmentsFromDb(event: any, productId: number): Promise<AttachmentRow[]> {
  try {
    const db = useClientDb(event)
    const { resolveIdLang } = await import('~/server/utils/lang')
    const idLang = await resolveIdLang(event)
    const rows = await db.query<any>(
      `SELECT a.id_attachment AS id,
              COALESCE(al.name, al_fr.name, a.file_name) AS name,
              a.file_name AS fileName,
              a.mime AS mime,
              a.file_size AS fileSize
         FROM ps_product_attachment pa
         JOIN ps_attachment a ON a.id_attachment = pa.id_attachment
         LEFT JOIN ps_attachment_lang al
           ON al.id_attachment = a.id_attachment AND al.id_lang = ?
         LEFT JOIN ps_attachment_lang al_fr
           ON al_fr.id_attachment = a.id_attachment AND al_fr.id_lang = 1
        WHERE pa.id_product = ?
        ORDER BY a.id_attachment ASC`,
      [idLang, productId],
    )
    return (rows || []).map((r: any) => ({
      id: Number(r.id),
      name: String(r.name || 'Fiche technique'),
      fileName: String(r.fileName || ''),
      mime: String(r.mime || 'application/pdf'),
      fileSize: Number(r.fileSize || 0),
    }))
  } catch (err: any) {
    if (err?.code === 'ER_NO_SUCH_TABLE' || err?.errno === 1146) return []
    console.warn('[product/:id] hydrate attachments failed:', err?.message)
    return []
  }
}

function formatPriceEUR(n: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
}

async function fetchProductDetail(db: any, id: number, idLang: number, unitPricingEnabled = false) {
  const b2b = await isTenantB2b(db)
  const taxJoin = buildTaxJoinForPrice(b2b)
  const priceExpr = buildPriceExprNonAgg(b2b, 'ps.price')
  const row = await db.get<any>(
    `SELECT p.id_product, p.reference, p.ean13, p.weight, p.active,
            COALESCE(pl.name, plf.name, '')                           AS name,
            COALESCE(pl.description, plf.description, '')             AS description,
            COALESCE(pl.description_short, plf.description_short, '') AS description_short,
            COALESCE(pl.link_rewrite, plf.link_rewrite, '')           AS link_rewrite,
            COALESCE(pl.meta_title, plf.meta_title, '')               AS meta_title,
            COALESCE(pl.meta_description, plf.meta_description, '')   AS meta_description,
            ${priceExpr} AS price,
            p.unit_price_ratio                                          AS unit_price_ratio,
            p.unity                                                     AS unity,
            (SELECT COALESCE(SUM(quantity), 0) FROM ps_stock_available WHERE id_product = p.id_product AND id_product_attribute = 0) AS quantity
       FROM ps_product p
       JOIN ps_product_shop ps     ON ps.id_product = p.id_product AND ps.id_shop = 1
  LEFT JOIN ps_product_lang pl    ON pl.id_product = p.id_product AND pl.id_lang = ? AND pl.id_shop = 1
  LEFT JOIN ps_product_lang plf   ON plf.id_product = p.id_product AND plf.id_lang = 1 AND plf.id_shop = 1
       ${taxJoin}
      WHERE p.id_product = ?
      LIMIT 1`,
    [idLang, id],
  )
  if (!row) return null

  const images = await db.query<{ id_image: number }>(
    `SELECT id_image FROM ps_image WHERE id_product = ? ORDER BY cover DESC, position ASC`,
    [id],
  )

  const combinations = await db.query<any>(
    `SELECT pa.id_product_attribute AS id, pa.reference, pa.price AS price_impact,
            pa.default_on, pas.quantity
       FROM ps_product_attribute pa
  LEFT JOIN ps_stock_available pas ON pas.id_product_attribute = pa.id_product_attribute AND pas.id_product = ?
      WHERE pa.id_product = ?
      ORDER BY pa.id_product_attribute`,
    [id, id],
  )

  
  
  const combinationAttrs = combinations.length === 0 ? [] : await db.query<any>(
    `SELECT pac.id_product_attribute,
            ag.id_attribute_group,
            COALESCE(agl.public_name, aglf.public_name, agl.name, aglf.name, '') AS group_name,
            a.id_attribute,
            COALESCE(al.name, alf.name, '') AS attribute_name,
            a.position
       FROM ps_product_attribute_combination pac
       JOIN ps_attribute       a   ON a.id_attribute      = pac.id_attribute
       JOIN ps_attribute_group ag  ON ag.id_attribute_group= a.id_attribute_group
  LEFT JOIN ps_attribute_lang  al  ON al.id_attribute     = a.id_attribute     AND al.id_lang = ?
  LEFT JOIN ps_attribute_lang  alf ON alf.id_attribute    = a.id_attribute     AND alf.id_lang = 1
  LEFT JOIN ps_attribute_group_lang agl  ON agl.id_attribute_group  = ag.id_attribute_group AND agl.id_lang = ?
  LEFT JOIN ps_attribute_group_lang aglf ON aglf.id_attribute_group = ag.id_attribute_group AND aglf.id_lang = 1
      WHERE pac.id_product_attribute IN (${combinations.map(() => '?').join(',')})
      ORDER BY ag.position, a.position`,
    [idLang, idLang, ...combinations.map((c: any) => c.id)],
  )

  const attrsByCombination = new Map<number, Array<{ groupId: number; group: string; attributeId: number; value: string }>>()
  for (const r of combinationAttrs) {
    const key = Number(r.id_product_attribute)
    if (!attrsByCombination.has(key)) attrsByCombination.set(key, [])
    attrsByCombination.get(key)!.push({
      groupId: Number(r.id_attribute_group),
      group: String(r.group_name || ''),
      attributeId: Number(r.id_attribute),
      value: String(r.attribute_name || ''),
    })
  }

  const features = await db.query<any>(
    `SELECT fp.id_feature   AS feature_id,
            fp.id_feature_value AS value_id,
            COALESCE(fl.name,  flf.name, '')  AS feature_name,
            COALESCE(fvl.value, fvlf.value, '') AS feature_value
       FROM ps_feature_product fp
  LEFT JOIN ps_feature_lang fl         ON fl.id_feature        = fp.id_feature        AND fl.id_lang       = ?
  LEFT JOIN ps_feature_lang flf        ON flf.id_feature       = fp.id_feature        AND flf.id_lang      = 1
  LEFT JOIN ps_feature_value_lang fvl  ON fvl.id_feature_value = fp.id_feature_value  AND fvl.id_lang      = ?
  LEFT JOIN ps_feature_value_lang fvlf ON fvlf.id_feature_value= fp.id_feature_value  AND fvlf.id_lang     = 1
      WHERE fp.id_product = ?`,
    [idLang, idLang, id],
  )

  const basePrice = Number(row.price)

  
  const sp = (await getActiveSpecificPrices([id])).get(id)
  const finalPrice = applySpecificPrice(basePrice, sp)
  const hasPromo = sp !== undefined && finalPrice < basePrice
  const reductionLabel = hasPromo && sp ? specificPriceLabel(sp) : undefined

  
  
  const featByName = (name: string) =>
    features.find((f: any) => String(f.feature_name).toLowerCase() === name.toLowerCase())?.feature_value as string | undefined
  const netWeightStr = featByName('Poids net')
  const unitsRaw = Number(featByName('Unités par colis') ?? '0')
  const unitsPerPack = Number.isFinite(unitsRaw) && unitsRaw > 1 ? unitsRaw : undefined
  const netWeightKg = parseWeightToKg(netWeightStr)
  const productWeightKg = Number(row.weight || 0)
  
  
  const totalNetKg = unitsPerPack && netWeightKg ? unitsPerPack * netWeightKg : netWeightKg
  
  
  const pricing = unitPricingEnabled
    ? deriveUnitPricing({
        priceHT: finalPrice,
        unitPriceRatio: row.unit_price_ratio,
        unity: row.unity,
        unitsPerPack,
        netWeightKg: totalNetKg,
        productWeightKg,
      })
    : { pricePerUnit: undefined, unitLabel: 'HT', divisor: undefined }
  const pricePerKgRaw = pricing.pricePerUnit
  const pricePerKgRawBeforeDiscount = hasPromo && pricing.divisor && pricing.divisor > 0
    ? basePrice / pricing.divisor
    : undefined

  
  const taxRow = await db.get<{ rate: number }>(
    `SELECT MAX(t.rate) AS rate
       FROM ps_product_shop ps
  LEFT JOIN ps_tax_rule tr ON tr.id_tax_rules_group = ps.id_tax_rules_group AND tr.id_country = 8
  LEFT JOIN ps_tax t       ON t.id_tax = tr.id_tax AND t.active = 1
      WHERE ps.id_product = ? AND ps.id_shop = 1`,
    [id],
  )
  const taxRate = Number(taxRow?.rate || 0) || undefined

  return {
    id: Number(row.id_product),
    name: String(row.name || ''),
    reference: String(row.reference || ''),
    price: finalPrice,
    priceRaw: finalPrice,
    priceFormatted: formatPriceEUR(finalPrice),
    priceRawBeforeDiscount: hasPromo ? basePrice : undefined,
    priceFormattedBeforeDiscount: hasPromo ? formatPriceEUR(basePrice) : undefined,
    pricePerKgRaw,
    pricePerKgFormatted: pricePerKgRaw !== undefined ? formatPriceEUR(pricePerKgRaw) : undefined,
    pricePerKgFormattedBeforeDiscount: pricePerKgRawBeforeDiscount !== undefined
      ? formatPriceEUR(pricePerKgRawBeforeDiscount)
      : undefined,
    unitLabel: pricing.unitLabel,
    reductionLabel,
    taxRate,
    description: String(row.description || ''),
    descriptionShort: String(row.description_short || ''),
    link_rewrite: String(row.link_rewrite || ''),
    meta_title: String(row.meta_title || ''),
    meta_description: String(row.meta_description || ''),
    weight: row.weight != null ? String(row.weight) : '',
    ean13: String(row.ean13 || ''),
    quantity: Number(row.quantity || 0),
    active: Number(row.active) === 1,
    images: images
      .map((i) => buildProductImage(Number(i.id_image), row.link_rewrite)?.src)
      .filter((s): s is string => Boolean(s)),
    imageSets: images
      .map((i) => buildProductImage(Number(i.id_image), row.link_rewrite))
      .filter((img): img is NonNullable<typeof img> => img !== null),
    combinations: combinations.map((c: any) => ({
      id: Number(c.id),
      reference: String(c.reference || ''),
      price: basePrice + Number(c.price_impact || 0),
      quantity: Number(c.quantity || 0),
      defaultOn: Number(c.default_on) === 1,
      attributes: attrsByCombination.get(Number(c.id)) ?? [],
    })),
    features: features.map((f: any) => ({
      id: Number(f.feature_id),
      name: String(f.feature_name || ''),
      valueId: Number(f.value_id),
      value: String(f.feature_value || ''),
    })),
  }
}

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id || isNaN(id)) throw createError({ statusCode: 400, message: 'ID invalide' })

  const { clientId } = getQuery(event)
  const { resolveIdLang } = await import('~/server/utils/lang')
  const idLang = await resolveIdLang(event)
  const db = clientId ? useClientDbById(String(clientId)) : useClientDb(event)

  const product = await fetchProductDetail(db, id, idLang, tenantHasUnitPricing(event))
  if (!product) throw createError({ statusCode: 404, message: 'Produit introuvable' })

  
  const dbAttachments = await hydrateAttachmentsFromDb(event, id)
  if (dbAttachments.length) {
    (product as any).attachments = dbAttachments
  }

  
  const spec = await hydrateSpecFromDb(event, id, idLang)
  if (spec) {
    (product as any).spec = spec
  }

  
  
  const accessories = await hydrateAccessoriesFromDb(event, db, id, idLang)
  if (accessories.length) {
    (product as any).accessories = accessories
  }

  return product
})

async function hydrateAccessoriesFromDb(event: any, db: any, id: number, idLang: number): Promise<Array<{
  id: number; name: string; slug: string; url: string; image?: string; price: number; priceFormatted: string
}>> {
  const b2b = await isTenantB2b(db)
  const taxJoin = buildTaxJoinForPrice(b2b)
  const priceExpr = buildPriceExprNonAgg(b2b, 'p.price')
  const rows = await db.query<any>(
    `SELECT p.id_product, p.id_category_default, ${priceExpr} AS price, pl.name, pl.link_rewrite,
            (SELECT i.id_image FROM ps_image i WHERE i.id_product = p.id_product AND i.cover = 1 LIMIT 1) AS id_image
       FROM ps_accessory a
       JOIN ps_product p ON p.id_product = CASE WHEN a.id_product_1 = ? THEN a.id_product_2 ELSE a.id_product_1 END
       JOIN ps_product_lang pl ON pl.id_product = p.id_product AND pl.id_lang = ?
       ${taxJoin}
      WHERE (a.id_product_1 = ? OR a.id_product_2 = ?) AND p.active = 1
      LIMIT 24`,
    [id, idLang, id, id],
  )
  if (!rows.length) return []

  const langRow = await db.get<{ iso_code: string }>(
    `SELECT iso_code FROM ps_lang WHERE id_lang = ? LIMIT 1`, [idLang],
  )
  const iso = langRow?.iso_code || 'fr'
  const langPrefix = iso && iso !== 'fr' ? `/${iso}` : ''
  const piliers = await resolveTenantPiliers(event, db, idLang)
  const prefixesByPilier: Record<string, string> = {}
  for (const p of piliers) prefixesByPilier[p.slug] = localizeRootSegment(p.slug, iso)

  const catIds = [...new Set(rows.map((r: any) => Number(r.id_category_default)).filter(Boolean))]
  const pathMap = await buildCategoryPathMap(db, catIds, idLang, piliers)

  return rows.map((r: any) => {
    const pid = Number(r.id_product)
    const slug = String(r.link_rewrite || '')
    const url = buildProductUrlFromCategory(
      Number(r.id_category_default), slug, pathMap,
      { prefixesByPilier, langPrefix, productId: pid },
    )
    const img = buildProductImage(Number(r.id_image), slug)
    const price = Number(r.price || 0)
    return {
      id: pid,
      name: String(r.name || ''),
      slug,
      url,
      image: img?.src,
      price,
      priceFormatted: formatPriceEUR(price),
    }
  })
}
