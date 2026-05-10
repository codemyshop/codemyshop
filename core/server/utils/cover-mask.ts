import sharp from 'sharp'

const STATIC_BASE_URL = process.env.AC_STATIC_BASE_URL ?? 'http://ac_nginx/cover-assets'

export async function generateGradientMask(
  rgb: [number, number, number],
  width: number,
  height: number,
): Promise<Buffer> {
  const buf = Buffer.alloc(width * height * 4)
  const [r, g, b] = rgb
  for (let x = 0; x < width; x++) {
    const alpha = Math.round(230 - (130 * x) / width)
    for (let y = 0; y < height; y++) {
      const idx = (y * width + x) * 4
      buf[idx] = r
      buf[idx + 1] = g
      buf[idx + 2] = b
      buf[idx + 3] = alpha
    }
  }
  return sharp(buf, { raw: { width, height, channels: 4 } }).png().toBuffer()
}

export async function loadTenantMask(filename: string, width: number, height: number): Promise<Buffer | null> {
  if (!filename) return null
  const url = `${STATIC_BASE_URL}/masques/${filename}`
  const res = await fetch(url, { signal: AbortSignal.timeout(8_000) }).catch(() => null)
  if (!res || !res.ok) return null
  const raw = Buffer.from(await res.arrayBuffer())
  return sharp(raw).resize(width, height, { fit: 'cover', position: 'center' }).png().toBuffer()
}

export async function resolveMask(
  filename: string | null,
  rgb: [number, number, number],
  width: number,
  height: number,
): Promise<Buffer> {
  if (filename) {
    const tenant = await loadTenantMask(filename, width, height)
    if (tenant) return tenant
  }
  return generateGradientMask(rgb, width, height)
}
