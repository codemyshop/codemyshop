/**
 * Food industry MDM normalization for catalog facets (Origin + Allergens).
 *
 * The cs_product_food table centralizes product Master Data (country_origin,
 * allergens_json, nutritional specs, etc.). Values entered on PrestaShop back-office are
 * bruyantes : casse variable, doublons ("PAYS-BAS" / "PAYS BAS"), composites
 * ("RPC / roasted in FRANCE"), noise ("see ingredient list", "the").
 * These helpers canonicalize on read for clean facets without
 * backfill DB destructif.
 *
 */

/** Alias pays → libellé canonique FR (Title Case, sans accent côté clé). */
const COUNTRY_ALIASES: Record<string, string> = {
  // Sigles
  rpc: 'Chine',
  usa: 'États-Unis',
  uk: 'Royaume-Uni',
  // Casse mixte
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
  // Spelling variants
  'pays-bas': 'Pays-Bas',
  'pays bas': 'Pays-Bas',
  'afrique du sud': 'Afrique du Sud',
  'etats-unis': 'États-Unis',
  'états-unis': 'États-Unis',
}

/** Values to discard (neither countries nor traceable). */
const COUNTRY_BLACKLIST = new Set([
  '', 'import', 'voir liste des ingredients', 'voir liste des ingrédients',
  'les', 'na', 'n/a', '-', 'divers', 'multi-origines', 'multi origines',
])

/**
 * Canonicalizes a raw country_origin value to a clean FR label
 * (Title Case) or null if the value is noise / not attributable.
 *
 * Rules:
 * 1. Strip composites after '/' or ',' (keep the root)
 * 2. Strip prefixes "Manufactured in ", "Origin "
 * 3. Lookup in alias map (lowercase key)
 * 4. Fallback: Title Case of original text
 */
export function canonicalizeCountry(raw: string | null | undefined): string | null {
  if (!raw) return null
  let s = String(raw).trim()
  if (!s) return null

  // Strip composites après séparateurs courants
  s = s.split(/[\/,]/)[0].trim()
  // Strip préfixes verbeux
  s = s.replace(/^manufactur[eé]\s+en\s+/i, '')
       .replace(/^origine\s+/i, '')
       .replace(/^en\s+/i, '')
       .trim()

  const key = s.toLowerCase().replace(/\s+/g, ' ')
  if (COUNTRY_BLACKLIST.has(key)) return null

  if (COUNTRY_ALIASES[key]) return COUNTRY_ALIASES[key]

  // Trop court ou bruit résiduel
  if (key.length < 3) return null

  // Fallback Title Case
  return s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

/**
 * 14 mandatory EU allergens (INCO regulation). Keys = technical slug,
 * values = { FR label, detectable keywords in allergens_json }.
 *
 * Matching is case-insensitive regex, on whole words or
 * stem prefixes, to tolerate variations ("peanut"/"peanuts", "wheat
 * gluten"/"wheat", "whole milk"/"milk").
 */
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

/**
 * Detects EU allergens present in an allergens_json field (JSON array
 * or concatenated free text). Returns the set of detected slugs.
 *
 * Tolerates: valid JSON, malformed JSON, plain text. No exception if
 * parsing fails — fallback to concatenated text.
 */
export function detectAllergens(raw: string | null | undefined): Set<string> {
  const out = new Set<string>()
  if (!raw) return out

  let text = String(raw)
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) text = parsed.join(' | ')
  } catch {
    // texte brut, on garde raw
  }

  for (const def of EU_ALLERGENS) {
    if (def.patterns.test(text)) out.add(def.slug)
  }
  return out
}

/** Liste publique des allergènes UE avec labels (pour rendu UI). */
export function listAllergenDefs(): Array<{ slug: string; label: string }> {
  return EU_ALLERGENS.map(a => ({ slug: a.slug, label: a.label }))
}

/**
 * Parses the query param `origin=Foo|Bar|Baz` into a set of canonicalized values.
 * The pipe is our separator (not the comma, to avoid collisions with
 * "Czech Republic"). URL-decode is applied by Nitro upstream.
 */
export function parseOriginFilter(raw: string | null | undefined): Set<string> {
  const out = new Set<string>()
  if (!raw) return out
  for (const v of String(raw).split('|')) {
    const c = canonicalizeCountry(v)
    if (c) out.add(c)
  }
  return out
}

/** Parse `allergens=gluten|lait` → set de slugs valides. */
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
