/**
 * Converts a display label to a URL-safe ASCII slug.
 * ex: "Sachets & Emballages" → "sachets-emballages"
 * ex: "Saveurs d'Orient"     → "saveurs-orient"
 * e.g. "Le p'tit sachet 50g"  → "petit-sachet-50g"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')    // strip combining accents
    .replace(/['''\u2019]/g, '')        // strip apostrophes
    .replace(/[&/\\|]/g, ' ')           // & / \ | → space
    .replace(/[^a-z0-9\s-]/g, ' ')     // other specials → space
    .trim()
    .replace(/\s+/g, '-')               // spaces → hyphens
    .replace(/-+/g, '-')                // collapse multiple hyphens
    .replace(/^-|-$/g, '')              // trim edge hyphens
}
