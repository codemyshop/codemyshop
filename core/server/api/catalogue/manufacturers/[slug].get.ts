

import { useClientDb, resolveClientId } from '~/server/utils/db'
import { resolveIdLang } from '~/server/utils/lang'
import { buildProductImage } from '~/server/utils/ps-image'

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export default defineEventHandler(async (event) => {
  const tenant = resolveClientId(event)
  if (!tenant) {
    throw createError({ statusCode: 404, message: 'Not found' })
  }

  const slug = getRouterParam(event, 'slug') || ''
  const db = useClientDb(event)
  const idLang = await resolveIdLang(event)
  const base = useRuntimeConfig().public.psFrontUrl as string || ''

  try {
    
    const manufacturers = await db.query<{ id_manufacturer: number; name: string; short_description: string | null; description: string | null; meta_title: string | null; meta_description: string | null }>(
      `SELECT m.id_manufacturer, m.name,
              ml.short_description, ml.description, ml.meta_title, ml.meta_description
       FROM ps_manufacturer m
       LEFT JOIN ps_manufacturer_lang ml ON ml.id_manufacturer = m.id_manufacturer AND ml.id_lang = ?
       WHERE m.active = 1`,
      [idLang],
    )

    const mfr = manufacturers.find(m => slugify(m.name) === slug)
    if (!mfr) {
      throw createError({ statusCode: 404, message: `Marque "${slug}" introuvable` })
    }

    
    const products = await db.query<{
      id: number; ref: string | null; name: string; priceRaw: number;
      id_image: number | null; link_rewrite: string | null
    }>(
      `SELECT p.id_product AS id, p.reference AS ref, pl.name AS name,
              p.price AS priceRaw, img.id_image,
              pl.link_rewrite
       FROM ps_product p
       JOIN ps_product_lang pl ON pl.id_product = p.id_product AND pl.id_lang = ?
       LEFT JOIN ps_image img ON img.id_product = p.id_product AND img.cover = 1
       WHERE p.active = 1 AND p.id_manufacturer = ?
       ORDER BY p.date_add DESC`,
      [idLang, mfr.id_manufacturer],
    )

    return {
      manufacturer: {
        id: mfr.id_manufacturer,
        name: mfr.name,
        slug,
        description: mfr.short_description || '',
        fullDescription: mfr.description || '',
        metaTitle: mfr.meta_title || mfr.name,
        metaDescription: mfr.meta_description || '',
        logo: `${base}/img/m/${mfr.id_manufacturer}.jpg`,
        nbProducts: products.length,
      },
      products: products.map(p => {
        const img = buildProductImage(p.id_image, p.link_rewrite)
        return {
          id: p.id,
          ref: p.ref || '',
          name: p.name,
          price: `${Number(p.priceRaw).toFixed(2)} €`,
          priceRaw: Number(p.priceRaw),
          image: img?.src ?? '',
          imageSrcset: img?.srcset,
          imageFallback: img?.fallback,
          url: `/produit/${p.link_rewrite || p.id}`,
        }
      }),
    }
  } catch (err: any) {
    if (err.statusCode) throw err
    console.error('[manufacturers/slug] DB error:', err?.message)
    throw createError({ statusCode: 500, message: 'Erreur serveur' })
  }
})
