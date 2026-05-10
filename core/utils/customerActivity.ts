/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * B2B commercial segmentation — professional activity declared by the
 * client. Source of truth: table `cs_customer_extra` (module
 * customer_extra). The codes are semantic (gms, CHR, wholesaler, …)
 * to remain readable in the database and independent of the Addify schema.
 *
 * Migration one-shot depuis `ps_addifycustomercustomdata` (codes opaques
 * `value1..value11`) → voir `synedre/ac_customer_extra_migrate.py`.
 */
export interface CustomerActivity {
  code: string
  label: string
}

export const CUSTOMER_ACTIVITIES: readonly CustomerActivity[] = [
  { code: 'gms',                label: 'GMS' },
  { code: 'superette',          label: 'Supérette' },
  { code: 'independant',        label: 'Indépendant' },
  { code: 'primeur',            label: 'Primeur' },
  { code: 'marche',             label: 'Marché' },
  { code: 'chr',                label: 'CHR' },
  { code: 'boucherie_orientale', label: 'Boucherie orientale' },
  { code: 'grossiste',          label: 'Grossiste' },
  { code: 'intermediaire_gms',  label: 'Intermédiaire (GMS)' },
  { code: 'epicerie_fine',      label: 'Epicerie fine' },
  { code: 'autre',              label: 'Autre' },
] as const

/**
 * Legacy Addify mapping (opaque codes) → semantic customer_extra codes.
 * Used only by the migration script + the read fallback
 * during the transition period.
 */
export const ADDIFY_ACTIVITY_CODE_MAP: Readonly<Record<string, string>> = {
  value1:  'gms',
  value2:  'superette',
  value3:  'independant',
  value4:  'primeur',
  value5:  'marche',
  value6:  'chr',
  value7:  'boucherie_orientale',
  value8:  'grossiste',
  value9:  'intermediaire_gms',
  value10: 'epicerie_fine',
  value11: 'autre',
} as const

export const ADDIFY_ACTIVITY_FIELD_NAME = 'activite'

export function labelForActivityCode(code: string | null | undefined): string | null {
  if (!code) return null
  return CUSTOMER_ACTIVITIES.find(a => a.code === code)?.label ?? null
}

export function isValidActivityCode(code: string | null | undefined): boolean {
  if (!code) return false
  return CUSTOMER_ACTIVITIES.some(a => a.code === code)
}

export function normalizeLegacyActivityCode(raw: string | null | undefined): string | null {
  if (!raw) return null
  if (isValidActivityCode(raw)) return raw
  return ADDIFY_ACTIVITY_CODE_MAP[raw] ?? null
}
