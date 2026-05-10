/**
 *
 * SIRET verification via the public data.gouv.fr API (recherche-entreprises).
 * Free, no API key, official INSEE/RNE source — already used on the
 * /hub/leads enrichissement (cf reference memory).
 *
 * Usage : `const r = await verifySiret('12345678901234'); if (r.valid) { ... }`
 *
 * Coverage ~100% of active French SIRETs. Also returns the
 * company name + city to pre-fill captured_company without asking the user.
 */

export interface SiretInfo {
  valid:        boolean
  siret?:       string
  siren?:       string
  companyName?: string
  legalForm?:   string
  city?:        string
  postalCode?:  string
  address?:     string
  /** Code APE/NAF de l'établissement (ex: "47.21Z" — Commerce de détail de fruits et légumes). */
  nafCode?:     string
  /** NAF code label (ex: "Retail trade of fruit and vegetables in specialized store"). */
  nafLabel?:    string
  /** INSEE employee size bracket (ex: "10 to 19 employees"). */
  staffSize?:   string
  /** Establishment creation date (ISO YYYY-MM-DD). */
  creationDate?: string
  error?:       string
}

const TIMEOUT_MS = 6000

export async function verifySiret(rawSiret: string): Promise<SiretInfo> {
  const cleaned = (rawSiret || '').replace(/\D/g, '')
  if (cleaned.length !== 14) {
    return { valid: false, error: 'Le SIRET doit contenir 14 chiffres.' }
  }

  const url = `https://recherche-entreprises.api.gouv.fr/search?q=${cleaned}&page=1&per_page=1`
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'example-shop-chatbot/1.0', Accept: 'application/json' },
      signal: ctrl.signal,
    })
    clearTimeout(timer)
    if (!res.ok) return { valid: false, error: 'Service de vérification indisponible, réessayez.' }

    const data = await res.json() as any
    const r = data?.results?.[0]
    if (!r) return { valid: false, error: 'SIRET introuvable au registre des entreprises.' }

    // The recherche-entreprises API returns the SIREN at top-level + a list
    // of establishments. We verify that the provided SIRET matches one of
    // these establishments (otherwise the user entered a SIRET from another
    // company whose SIREN happens to match the first digits).
    const matched = (r.matching_etablissements || []).find((e: any) => e.siret === cleaned)
                   || (r.siege?.siret === cleaned ? r.siege : null)
    if (!matched) {
      return { valid: false, error: 'Ce SIRET ne correspond à aucun établissement actif.' }
    }
    // Formatted address: number + type + label (ex: "12 RUE DES LILAS").
    const addressParts = [matched.numero_voie, matched.type_voie, matched.libelle_voie]
      .filter(Boolean).map((v: any) => String(v).trim())
    const address = addressParts.join(' ')
    // APE code: priority from matched establishment, fallback to legal entity.
    const nafCode  = String(matched.activite_principale || r.activite_principale || '').trim()
    const nafLabel = String(matched.libelle_activite_principale || r.libelle_activite_principale || '').trim()

    return {
      valid:        true,
      siret:        cleaned,
      siren:        cleaned.slice(0, 9),
      companyName:  String(r.nom_complet || r.nom_raison_sociale || matched.libelle_etablissement || ''),
      legalForm:    String(r.nature_juridique || ''),
      city:         String(matched.libelle_commune || matched.commune || ''),
      postalCode:   String(matched.code_postal || '').trim() || undefined,
      address:      address || undefined,
      nafCode:      nafCode || undefined,
      nafLabel:     nafLabel || undefined,
      staffSize:    String(r.tranche_effectif_salarie || matched.tranche_effectif_salarie || '').trim() || undefined,
      creationDate: String(matched.date_creation || r.date_creation || '').trim() || undefined,
    }
  } catch (e: any) {
    clearTimeout(timer)
    return { valid: false, error: 'Vérification SIRET échouée — réessayez dans un instant.' }
  }
}

/** Email format regex validation (no SMTP — for the chatbot, format is sufficient). */
export function isEmailFormat(raw: string): boolean {
  const v = (raw || '').trim().toLowerCase()
  return /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(v) && v.length <= 255
}
