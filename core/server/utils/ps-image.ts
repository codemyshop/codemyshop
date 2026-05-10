/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * Builds product image URLs according to the SEO pattern + responsive layout emitted by the
 * module PS `ac_productcovergen` (migrate.php) :
 *
 *   /img/p/{digits(id_image)}/{id_image}-{slug}-{400|600|800|1200}.webp
 *   /img/p/{digits(id_image)}/{id_image}.jpg          ← fallback 800×800
 *
 * The SEO slug is derived from ps_product_lang.link_rewrite sanitized like the
 * PHP (`sanitizeSlug`) — must remain identical or risk 404.
 */

const PRODUCT_IMAGE_WIDTHS = [400, 600, 800, 1200] as const
const DEFAULT_WIDTH = 800

export interface ProductImage {
  src: string
  srcset: string
  fallback: string
  slug: string
}

export function psImageDigitsPath(idImage: number): string {
  return String(idImage).split('').join('/')
}

export function sanitizeImageSlug(raw: string | null | undefined): string {
  if (!raw) return 'product'
  const s = raw
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  return s || 'product'
}

export function buildProductImage(
  idImage: number | null | undefined,
  linkRewrite: string | null | undefined,
): ProductImage | null {
  if (!idImage) return null
  const digits = psImageDigitsPath(Number(idImage))
  const slug = sanitizeImageSlug(linkRewrite)
  const base = `/img/p/${digits}/${idImage}-${slug}`
  return {
    src: `${base}-${DEFAULT_WIDTH}.webp`,
    srcset: PRODUCT_IMAGE_WIDTHS.map((w) => `${base}-${w}.webp ${w}w`).join(', '),
    fallback: `/img/p/${digits}/${idImage}.jpg`,
    slug,
  }
}
