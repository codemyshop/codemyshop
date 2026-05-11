

export function hexToHsl(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16) / 255
  const g = parseInt(h.slice(2, 4), 16) / 255
  const b = parseInt(h.slice(4, 6), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d   = max - min
  const l   = (max + min) / 2

  let hue = 0
  let sat = 0

  if (d !== 0) {
    sat = d / (1 - Math.abs(2 * l - 1))
    if (max === r) hue = ((g - b) / d) % 6
    else if (max === g) hue = (b - r) / d + 2
    else hue = (r - g) / d + 4
    hue = Math.round(hue * 60)
    if (hue < 0) hue += 360
  }

  return [hue, Math.round(sat * 100), Math.round(l * 100)]
}

export function generateColorScale(hex: string): Record<string, string> {
  const [h, s, baseL] = hexToHsl(hex)

  
  const lightSteps = [500, 400, 300, 200, 100, 50]
  const darkSteps  = [700, 800, 900]

  const result: Record<string, string> = {
    DEFAULT: hex,
    '600':   hex,  
  }

  
  const n = lightSteps.length + 1   
  lightSteps.forEach((shade, i) => {
    const t  = (i + 1) / n
    const l  = Math.min(97, Math.round(baseL + t * (97 - baseL)))
    const sv = Math.round(s * Math.max(0.15, 1 - t * 0.82))
    result[String(shade)] = `hsl(${h}, ${sv}%, ${l}%)`
  })

  
  const m = darkSteps.length + 1
  darkSteps.forEach((shade, i) => {
    const t  = (i + 1) / m
    const l  = Math.max(3, Math.round(baseL - t * (baseL - 10)))
    const sv = Math.round(s * (1 - t * 0.15))
    result[String(shade)] = `hsl(${h}, ${sv}%, ${l}%)`
  })

  return result
}
