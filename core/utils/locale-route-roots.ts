/**
 *
 * Mapping table of translatable root route segments.
 * E.g. /grossiste/* (FR) ↔ /wholesaler/* (EN). Used by:
 * - useLocalePath()             → frontend URL generation
 *   - server/middleware/04-i18n-root-rewrite.ts → rewrite URL entrante → canonical FR
 *
 * Convention: canonical = FR (master slug in Nuxt pages).
 * Add an entry here + localize in ROOT_TRANSLATIONS. Zero code to
 * touch downstream — all routing via these maps.
 */

/** Segments racine canonical (FR) reconnus comme traduisibles. */
export const ROOT_CANONICAL_FR = new Set<string>([
  'grossiste',   // silo produits
  'marque',      // silo marque (singulier — détail)
  'marques',     // silo marque (pluriel — liste)
  'produit',     // fiche produit legacy
  'blog',
  'recherche',
  'contact',
  'catalogue',
  'page',
])

/**
 * Translations by iso_code. Key = iso, value = { fr_segment: localized_segment }.
 * Add a mapping to translate /en/grossiste/ → /en/wholesaler/.
 */
export const ROOT_TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    grossiste: 'wholesaler',
    marque:    'brand',
    marques:   'brands',
    produit:   'product',
    blog:      'blog',       // même mot
    recherche: 'search',
    contact:   'contact',    // même mot
    catalogue: 'catalog',
    page:      'page',       // même mot
  },
  de: {
    grossiste: 'grosshandel',
    marque:    'marke',
    marques:   'marken',
    produit:   'produkt',
    blog:      'blog',
    recherche: 'suche',
    contact:   'kontakt',
    catalogue: 'katalog',
    page:      'seite',
  },
  es: {
    grossiste: 'mayorista',
    marque:    'marca',
    marques:   'marcas',
    produit:   'producto',
    blog:      'blog',
    recherche: 'buscar',
    contact:   'contacto',
    catalogue: 'catalogo',
    page:      'pagina',
  },
  it: {
    grossiste: 'grossista',
    marque:    'marchio',
    marques:   'marchi',
    produit:   'prodotto',
    blog:      'blog',
    recherche: 'ricerca',
    contact:   'contatto',
    catalogue: 'catalogo',
    page:      'pagina',
  },
}

/**
 * Master list of locales for which we have translations of
 * root segments (keys from ROOT_TRANSLATIONS above).
 *
 * The **active list of locales** lives in `runtimeConfig.public.i18nLocales`
 * (declared in `clients/<tenant>/nuxt.config.ts`). The composables read it
 * via `useRuntimeConfig()`.
 */
export const ALL_POSSIBLE_LOCALES = Object.keys(ROOT_TRANSLATIONS)

/** Reverse map : iso → { localized_segment: fr_segment }. Utilisé par le middleware. */
const REVERSE_MAPS: Record<string, Record<string, string>> = {}
for (const [iso, map] of Object.entries(ROOT_TRANSLATIONS)) {
  const rev: Record<string, string> = {}
  for (const [fr, loc] of Object.entries(map)) rev[loc] = fr
  REVERSE_MAPS[iso] = rev
}

/** Translates a root segment from FR to its localized version for iso. Fallback = FR. */
export function localizeRootSegment(segment: string, iso: string): string {
  if (!iso || iso === 'fr') return segment
  return ROOT_TRANSLATIONS[iso]?.[segment] ?? segment
}

/** Reverse: translates a localized segment to its canonical FR. */
export function canonicalizeRootSegment(segment: string, iso: string): string | null {
  if (!iso || iso === 'fr') return ROOT_CANONICAL_FR.has(segment) ? segment : null
  return REVERSE_MAPS[iso]?.[segment] ?? (ROOT_CANONICAL_FR.has(segment) ? segment : null)
}
