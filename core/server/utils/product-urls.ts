

export function buildProductUrl(id: number, linkRewrite?: string | null): string {
  if (linkRewrite && linkRewrite.length > 0) {
    return `/produit/${id}-${linkRewrite}`
  }
  return `/produit/${id}`
}

const SIZE_TO_WIDTH: Record<string, number> = {
  cart:   400,
  home:   600,
  medium: 800,
  large:  1200,
}

function normalizeSlug(linkRewrite?: string | null): string {
  return (linkRewrite && linkRewrite.length > 0)
    ? linkRewrite
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60) || 'product'
    : 'product'
}

export function buildImageUrl(
  imageId: number,
  size: 'home' | 'cart' | 'medium' | 'large' = 'large',
  linkRewrite?: string | null,
  _clientId?: string,
): string | undefined {
  if (!imageId || imageId <= 0) return undefined
  const width = SIZE_TO_WIDTH[size] ?? 1200
  const digits = String(imageId).split('').join('/')
  const slug = normalizeSlug(linkRewrite)
  return `/img/p/${digits}/${imageId}-${slug}-${width}.webp`
}

export function buildImageSrcset(
  imageId: number,
  linkRewrite?: string | null,
): string | undefined {
  if (!imageId || imageId <= 0) return undefined
  const digits = String(imageId).split('').join('/')
  const slug = normalizeSlug(linkRewrite)
  return [400, 600, 800, 1200]
    .map((w) => `/img/p/${digits}/${imageId}-${slug}-${w}.webp ${w}w`)
    .join(', ')
}
