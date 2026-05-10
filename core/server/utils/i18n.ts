/**
 *
 * Server-side i18n helper — Nitro equivalent of `useHubT()` on the Nuxt frontend.
 *
 * Lit `ps_translation` (table runtime PS native, runtime depuis cutover PG
 * 2026-04-30). Redis cache (TTL 10 min) to avoid repetitive SELECTs
 * in email/PDF senders + EventBus handlers.
 *
 * Usage :
 *   import { t } from '~/server/utils/i18n'
 *   const subject = await t('email.welcome_subject', 1, 'Bienvenue')
 *
 * Convention key :
 * - Prefix `domaine_clé_specifique` (snake_case)
 *   - Domaine : HubFunnel, HubRdv, HubEmail, HubAuth, HubDevis, …
 * - The `domain` field in the database is used for grouping, not for resolution.
 *
 * Fallback :
 * - If the key doesn't exist in the DB → returns `fallback` (usually the
 * hardcoded FR version). Writes NOTHING to the DB (no auto-seeding
 * on send — that pollutes the table with questionable keys).
 */

import { sql } from 'drizzle-orm'
import { usePocPg } from '../db/drizzle-pg'
import { cachedFetch } from './redis'

const CACHE_TTL_SEC = 10 * 60

/**
 * Resolves an i18n key. Returns the `fallback` if not found in the DB.
 * @param key      Identifiant de la traduction (ex: 'rdv_prefilled_quote_msg')
 * @param idLang   1=FR, 2=EN, 3=DE
 * @param fallback Chaîne par défaut si la key n'existe pas (souvent = FR hardcodé)
 */
export async function t(key: string, idLang: number = 1, fallback: string = ''): Promise<string> {
  return cachedFetch<string>(
    `i18n:${key}:${idLang}`,
    CACHE_TTL_SEC,
    async () => {
      try {
        const rows = await usePocPg().execute<any>(sql`
          SELECT translation
            FROM cs_main.ps_translation
           WHERE key = ${key} AND id_lang = ${idLang}
           LIMIT 1
        `) as any[]
        return rows[0]?.translation ? String(rows[0].translation) : fallback
      } catch (err: any) {
        console.warn(`[i18n] DB error key=${key} lang=${idLang}:`, err?.message)
        return fallback
      }
    },
  )
}

/**
 * Substitutes the placeholders `{key}` in a template with the values
 * provided. No HTML escaping — intended for short labels. For rich HTML,
 * utiliser email-template-render.ts.
 */
export function tFormat(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{([a-z_][a-z0-9_]*)\}/gi, (m, k) =>
    vars[k] !== undefined ? String(vars[k]) : m,
  )
}
