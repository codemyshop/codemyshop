

export function ensureTrailingSlash(url: string | null | undefined): string {
  if (!url) return url || ''
  
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('#') || url.startsWith('?')) {
    return url
  }
  
  const hashIdx = url.indexOf('#')
  const queryIdx = url.indexOf('?')
  const cut = [hashIdx, queryIdx].filter(i => i >= 0).sort((a, b) => a - b)[0] ?? -1
  const base = cut >= 0 ? url.slice(0, cut) : url
  const suffix = cut >= 0 ? url.slice(cut) : ''
  if (!base) return url
  return base.endsWith('/') ? url : `${base}/${suffix}`
}

export function isCategoryHref(url: string | null | undefined): boolean {
  if (!url) return false
  
  return /^\/(grossiste|marque|catalogue|c)(\/|$)/i.test(url)
}
