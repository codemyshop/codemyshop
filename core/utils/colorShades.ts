/**
 * Generates a palette of 10 shades (50→900) from a hexadecimal color.
 * The input color is positioned at level "600" (main interactive shade).
 */

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

/**
 * Generates all shades of a primary color.
 * The input is treated as shade 600 (strong CTA color).
 * Light shades (50→500): increasing brightness, decreasing saturation.
 * Dark shades (700→900): decreasing brightness.
 */
export function generateColorScale(hex: string): Record<string, string> {
  const [h, s, baseL] = hexToHsl(hex)

  // Positions relatives pour les nuances plus claires (500→50)
  const lightSteps = [500, 400, 300, 200, 100, 50]
  const darkSteps  = [700, 800, 900]

  const result: Record<string, string> = {
    DEFAULT: hex,
    '600':   hex,  // couleur exacte de la marque
  }

  // Nuances claires : interpolation vers L=97%, S réduite progressivement
  const n = lightSteps.length + 1   // +1 = 600 comme point de départ
  lightSteps.forEach((shade, i) => {
    const t  = (i + 1) / n
    const l  = Math.min(97, Math.round(baseL + t * (97 - baseL)))
    const sv = Math.round(s * Math.max(0.15, 1 - t * 0.82))
    result[String(shade)] = `hsl(${h}, ${sv}%, ${l}%)`
  })

  // Nuances sombres : interpolation vers L=10%, S légèrement réduite
  const m = darkSteps.length + 1
  darkSteps.forEach((shade, i) => {
    const t  = (i + 1) / m
    const l  = Math.max(3, Math.round(baseL - t * (baseL - 10)))
    const sv = Math.round(s * (1 - t * 0.15))
    result[String(shade)] = `hsl(${h}, ${sv}%, ${l}%)`
  })

  return result
}
