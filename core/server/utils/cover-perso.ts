import sharp from 'sharp'

const STATIC_BASE_URL = process.env.AC_STATIC_BASE_URL ?? 'http://ac_nginx/cover-assets'

const LOCAL_PERSOS = ['alexandre-standing.png']

const pickRandom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]!

async function fetchAsBuffer(url: string, timeoutMs = 8_000): Promise<Buffer | null> {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) }).catch(() => null)
  if (!res || !res.ok) return null
  return Buffer.from(await res.arrayBuffer())
}

export async function pickPerso(
  forceName?: string,
): Promise<{ buffer: Buffer; filename: string } | null> {
  let candidates = LOCAL_PERSOS
  if (forceName) {
    const filtered = LOCAL_PERSOS.filter(n => n.toLowerCase().includes(forceName.toLowerCase()))
    if (filtered.length) candidates = filtered
  }
  if (!candidates.length) return null
  const filename = pickRandom(candidates)
  const buf = await fetchAsBuffer(`${STATIC_BASE_URL}/persos/${filename}`)
  return buf ? { buffer: buf, filename } : null
}

export async function removeGreenScreen(buf: Buffer, threshold = 100, tolerance = 60): Promise<Buffer> {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]!
    const g = data[i + 1]!
    const b = data[i + 2]!
    if (g > threshold && g > r + tolerance && g > b + tolerance) {
      data[i] = 255
      data[i + 1] = 255
      data[i + 2] = 255
      data[i + 3] = 0
    }
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer()
}

export async function loadPersoForCover(opts: {
  forceName?: string
  expressionUrl?: string | null
}): Promise<{ buffer: Buffer; filename: string } | null> {
  const picked = await pickPerso(opts.forceName)
  if (!picked) return null
  if (/green|vert/i.test(picked.filename)) {
    return { ...picked, buffer: await removeGreenScreen(picked.buffer) }
  }
  return picked
}
