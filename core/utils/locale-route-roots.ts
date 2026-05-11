

export const ROOT_CANONICAL_FR = new Set<string>([
  'grossiste',   
  'marque',      
  'marques',     
  'produit',     
  'blog',
  'recherche',
  'contact',
  'catalogue',
  'page',
])

export const ROOT_TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    grossiste: 'wholesaler',
    marque:    'brand',
    marques:   'brands',
    produit:   'product',
    blog:      'blog',       
    recherche: 'search',
    contact:   'contact',    
    catalogue: 'catalog',
    page:      'page',       
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

export const ALL_POSSIBLE_LOCALES = Object.keys(ROOT_TRANSLATIONS)

const REVERSE_MAPS: Record<string, Record<string, string>> = {}
for (const [iso, map] of Object.entries(ROOT_TRANSLATIONS)) {
  const rev: Record<string, string> = {}
  for (const [fr, loc] of Object.entries(map)) rev[loc] = fr
  REVERSE_MAPS[iso] = rev
}

export function localizeRootSegment(segment: string, iso: string): string {
  if (!iso || iso === 'fr') return segment
  return ROOT_TRANSLATIONS[iso]?.[segment] ?? segment
}

export function canonicalizeRootSegment(segment: string, iso: string): string | null {
  if (!iso || iso === 'fr') return ROOT_CANONICAL_FR.has(segment) ? segment : null
  return REVERSE_MAPS[iso]?.[segment] ?? (ROOT_CANONICAL_FR.has(segment) ? segment : null)
}
