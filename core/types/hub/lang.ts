/**
 *
 * Contrats DTO Sprint 12 — Multilang Hub PIM.
 *
 * Convention :
 *   - GET  /api/bo/{categories,products}/:id?lang=X  → lit `ps_*_lang` WHERE id_lang=X
 *   - PUT  /api/bo/{categories,products}/:id?lang=X  → UPSERT via INSERT…ON DUPLICATE KEY
 * - lang=1 (default FR PrestaShop) = master language: only authorized to mutate
 * structure (add/remove/reorder FAQ, linked categories, etc.).
 * - lang≠1 = pure translation: write access limited to localized fields.
 */

/** Une langue active telle que déclarée par `ps_lang` du tenant courant. */
export interface HubLang {
  id_lang: number
  iso_code: string
  name: string
  /** `true` if it is the default PrestaShop language (id_lang = 1). */
  is_default: boolean
  active: boolean
}

/** Response from GET /api/bo/lang/list */
export interface HubLangListResponse {
  langs: HubLang[]
  default_id: number
}
