import sharp from 'sharp'

const PEXELS_API_KEY = process.env.PEXELS_API_KEY ?? ''
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY ?? ''
const STATIC_BASE_URL = process.env.AC_STATIC_BASE_URL ?? 'http://ac_nginx/cover-assets'

const STOPWORDS_FR = new Set(
  ('le la les un une des de du d l au aux en et ou mais ni car que qui quoi ' +
    'ce cette ces son sa ses mon ma mes ton ta tes notre nos votre vos leur leurs ' +
    'je tu il elle on nous vous ils elles se ne pas pour par sur avec dans est sont ' +
    'a etre avoir fait faire plus moins tout tous toute toutes autre autres comme ' +
    'aussi bien entre sans sous tres chez vers avant apres encore aussi meme deja ' +
    'comment pourquoi quand ou dont voici voila'
  ).split(/\s+/),
)

const LOCAL_FONDS = ['fond-abstract-2.webp', 'fond-tech-1.jpg']

const stripAccents = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')

export function extractKeywords(title: string, maxKw = 3): string {
  const matches = (title.toLowerCase().match(/[a-zA-ZÀ-ÿ]{3,}/g) ?? [])
  const seen = new Set<string>()
  const out: string[] = []
  for (const w of matches) {
    if (w.length <= 3) continue
    if (STOPWORDS_FR.has(stripAccents(w))) continue
    if (seen.has(w)) continue
    seen.add(w)
    out.push(w)
    if (out.length >= maxKw) break
  }
  return out.join(' ')
}

function isGrayscaleHex(hex: string, tolerance = 18): boolean {
  if (!hex || !hex.startsWith('#') || hex.length < 7) return false
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  if ([r, g, b].some(Number.isNaN)) return false
  return Math.abs(r - g) < tolerance && Math.abs(g - b) < tolerance && Math.abs(r - b) < tolerance
}

const pickRandom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]!

async function fetchAsBuffer(url: string, init?: RequestInit, timeoutMs = 15_000): Promise<Buffer | null> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal })
    if (!res.ok) return null
    return Buffer.from(await res.arrayBuffer())
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

export async function fetchPexels(query: string, allowGrayscale = false): Promise<Buffer | null> {
  if (!PEXELS_API_KEY || !query) return null
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=30&orientation=landscape`
  const res = await fetch(url, { headers: { Authorization: PEXELS_API_KEY }, signal: AbortSignal.timeout(10_000) }).catch(() => null)
  if (!res || !res.ok) return null
  const data = (await res.json()) as { photos?: Array<{ id: number; avg_color?: string; src: { large2x: string }; photographer: string }> }
  let photos = data.photos ?? []
  if (!photos.length) return null
  if (!allowGrayscale) {
    const colored = photos.filter(p => !isGrayscaleHex(p.avg_color ?? ''))
    if (colored.length) photos = colored
  }
  const photo = pickRandom(photos.slice(0, 10))
  return fetchAsBuffer(photo.src.large2x)
}

export async function fetchUnsplash(query: string, allowGrayscale = false): Promise<Buffer | null> {
  if (!UNSPLASH_ACCESS_KEY || !query) return null
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=20&orientation=landscape`
  const res = await fetch(url, {
    headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` },
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null)
  if (!res || !res.ok) return null
  const data = (await res.json()) as { results?: Array<{ id: string; color?: string; urls: { regular: string }; user: { name: string } }> }
  let results = data.results ?? []
  if (!results.length) return null
  if (!allowGrayscale) {
    const grayTags = new Set(['black_and_white', 'black', 'white'])
    const colored = results.filter(r => !grayTags.has(r.color ?? ''))
    if (colored.length) results = colored
  }
  const photo = pickRandom(results.slice(0, 8))
  return fetchAsBuffer(photo.urls.regular)
}

export async function pickLocalFond(): Promise<Buffer | null> {
  if (!LOCAL_FONDS.length) return null
  const file = pickRandom(LOCAL_FONDS)
  return fetchAsBuffer(`${STATIC_BASE_URL}/fonds/${file}`)
}

export async function fetchPhotoBackground(title: string, allowGrayscale = false): Promise<Buffer | null> {
  const keywords = extractKeywords(title)
  if (!keywords) return null
  return (await fetchPexels(keywords, allowGrayscale)) ?? (await fetchUnsplash(keywords, allowGrayscale))
}

export async function fetchPhotoBackgroundQuery(query: string, allowGrayscale = false): Promise<Buffer | null> {
  if (!query) return null
  return (await fetchPexels(query, allowGrayscale)) ?? (await fetchUnsplash(query, allowGrayscale))
}

export async function prepPhotoBackground(buf: Buffer, width: number, height: number): Promise<Buffer> {
  return sharp(buf).resize(width, height, { fit: 'cover', position: 'center' }).blur(2).png().toBuffer()
}

export async function prepLocalFond(buf: Buffer, width: number, height: number): Promise<Buffer> {
  return sharp(buf).resize(width, height, { fit: 'cover', position: 'center' }).png().toBuffer()
}

export async function solidColorBackground(rgb: [number, number, number], width: number, height: number): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 4, background: { r: rgb[0], g: rgb[1], b: rgb[2], alpha: 1 } },
  })
    .png()
    .toBuffer()
}

export async function resolveBackground(opts: {
  title: string
  width: number
  height: number
  usePhotoBg: boolean
  fallbackRgb: [number, number, number]
  allowGrayscale?: boolean
}): Promise<Buffer> {
  const { title, width, height, usePhotoBg, fallbackRgb, allowGrayscale = false } = opts
  if (usePhotoBg) {
    const photo = await fetchPhotoBackground(title, allowGrayscale)
    if (photo) return prepPhotoBackground(photo, width, height)
  }
  const local = await pickLocalFond()
  if (local) return prepLocalFond(local, width, height)
  return solidColorBackground(fallbackRgb, width, height)
}
