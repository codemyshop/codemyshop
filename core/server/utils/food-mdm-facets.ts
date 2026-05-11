

const COUNTRY_ALIASES: Record<string, string> = {
  
  rpc: 'Chine',
  usa: 'États-Unis',
  uk: 'Royaume-Uni',
  
  chine: 'Chine',
  espagne: 'Espagne',
  turquie: 'Turquie',
  thailande: 'Thaïlande',
  'thaïlande': 'Thaïlande',
  vietnam: 'Vietnam',
  iran: 'Iran',
  chili: 'Chili',
  maroc: 'Maroc',
  israel: 'Israël',
  'israël': 'Israël',
  grece: 'Grèce',
  'grèce': 'Grèce',
  kenya: 'Kenya',
  taiwan: 'Taïwan',
  'taïwan': 'Taïwan',
  bolivie: 'Bolivie',
  tunisie: 'Tunisie',
  algerie: 'Algérie',
  'algérie': 'Algérie',
  france: 'France',
  italie: 'Italie',
  portugal: 'Portugal',
  belgique: 'Belgique',
  allemagne: 'Allemagne',
  bresil: 'Brésil',
  'brésil': 'Brésil',
  argentine: 'Argentine',
  perou: 'Pérou',
  'pérou': 'Pérou',
  liban: 'Liban',
  egypte: 'Égypte',
  'égypte': 'Égypte',
  inde: 'Inde',
  
  'pays-bas': 'Pays-Bas',
  'pays bas': 'Pays-Bas',
  'afrique du sud': 'Afrique du Sud',
  'etats-unis': 'États-Unis',
  'états-unis': 'États-Unis',
}

const COUNTRY_BLACKLIST = new Set([
  '', 'import', 'voir liste des ingredients', 'voir liste des ingrédients',
  'les', 'na', 'n/a', '-', 'divers', 'multi-origines', 'multi origines',
])

export function canonicalizeCountry(raw: string | null | undefined): string | null {
  if (!raw) return null
  let s = String(raw).trim()
  if (!s) return null

  
  s = s.split(/[\/,]/)[0].trim()
  
  s = s.replace(/^manufactur[eé]\s+en\s+/i, '')
       .replace(/^origine\s+/i, '')
       .replace(/^en\s+/i, '')
       .trim()

  const key = s.toLowerCase().replace(/\s+/g, ' ')
  if (COUNTRY_BLACKLIST.has(key)) return null

  if (COUNTRY_ALIASES[key]) return COUNTRY_ALIASES[key]

  
  if (key.length < 3) return null

  
  return s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

interface AllergenDef {
  slug: string
  label: string
  patterns: RegExp
}

const EU_ALLERGENS: AllergenDef[] = [
  { slug: 'gluten',    label: 'Gluten',             patterns: /\b(gluten|bl[eé]|seigle|orge|avoine|[eé]peautre|kamut)\b/i },
  { slug: 'crustaces', label: 'Crustacés',          patterns: /\b(crustac[eé]s?|crevettes?|homard|crabe|langoustine)\b/i },
  { slug: 'oeufs',     label: 'Œufs',               patterns: /\b(œufs?|oeufs?)\b/i },
  { slug: 'poissons',  label: 'Poissons',           patterns: /\b(poissons?|thon|saumon|morue|anchois|sardine)\b/i },
  { slug: 'arachides', label: 'Arachides',          patterns: /\b(arachides?|cacahu[eè]tes?)\b/i },
  { slug: 'soja',      label: 'Soja',               patterns: /\b(soja|l[eé]cithine de soja)\b/i },
  { slug: 'lait',      label: 'Lait',               patterns: /\b(lait|lactose|beurre|cr[eè]me|yaourt|fromage|caséine|caseine|lactos[eé]rum)\b/i },
  { slug: 'fruits-coque', label: 'Fruits à coque',  patterns: /\b(fruits?\s+[aà]\s+coques?|amandes?|noisettes?|noix(?!\s+de\s+coco)|noix\s+de\s+cajou|pistaches?|p[eé]canes?|macadamias?|noix\s+du\s+br[eé]sil)\b/i },
  { slug: 'celeri',    label: 'Céleri',             patterns: /\bc[eé]leri\b/i },
  { slug: 'moutarde',  label: 'Moutarde',           patterns: /\bmoutarde\b/i },
  { slug: 'sesame',    label: 'Sésame',             patterns: /\bs[eé]sames?\b/i },
  { slug: 'sulfites',  label: 'Sulfites',           patterns: /\b(sulfites?|anhydride\s+sulfureux|e\s?22[0-8])\b/i },
  { slug: 'lupin',     label: 'Lupin',              patterns: /\blupin\b/i },
  { slug: 'mollusques', label: 'Mollusques',        patterns: /\b(mollusques?|moules?|hu[iî]tres?|calmar|seiche|escargots?)\b/i },
]

export function detectAllergens(raw: string | null | undefined): Set<string> {
  const out = new Set<string>()
  if (!raw) return out

  let text = String(raw)
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) text = parsed.join(' | ')
  } catch {
    
  }

  for (const def of EU_ALLERGENS) {
    if (def.patterns.test(text)) out.add(def.slug)
  }
  return out
}

export function listAllergenDefs(): Array<{ slug: string; label: string }> {
  return EU_ALLERGENS.map(a => ({ slug: a.slug, label: a.label }))
}

export function parseOriginFilter(raw: string | null | undefined): Set<string> {
  const out = new Set<string>()
  if (!raw) return out
  for (const v of String(raw).split('|')) {
    const c = canonicalizeCountry(v)
    if (c) out.add(c)
  }
  return out
}

export function parseAllergensFilter(raw: string | null | undefined): Set<string> {
  const valid = new Set(EU_ALLERGENS.map(a => a.slug))
  const out = new Set<string>()
  if (!raw) return out
  for (const v of String(raw).split('|')) {
    const s = v.trim().toLowerCase()
    if (valid.has(s)) out.add(s)
  }
  return out
}
