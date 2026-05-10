/**
 *
 * Google Search Console service — the SEO engine of the platform.
 *
 * Queries the Google Search Console API via Service Account to identify:
 * - Keywords on page 2 (positions 11-20) with search volume → conquest opportunities
 * - Pages losing traffic → candidates for AI rewriting
 *
 * Architecture (DB-Only depuis 2026-04-25) :
 * - 1 global Google Service Account for all clients (ac-indexing@…),
 * encrypted and stored in `cs_client_config[_global].secrets.gscServiceAccount`.
 * - 1 GSC siteUrl per tenant, stored in
 *     `cs_client_config[<tenant>].config_json.gscSiteUrl`.
 * - Disk file fallback (legacy) tolerated only if the DB is non-responsive
 *     (chemin: `../secrets/gsc-service-account.json` ou env GSC_SERVICE_ACCOUNT_PATH).
 *
 * If Google Search Console is unreachable, return an empty array (non-blocking).
 */
import { resolve } from 'node:path'
import { existsSync, readFileSync } from 'node:fs'
import { readGlobalSecret } from '~/server/utils/secrets'

export interface GscOpportunity {
  query: string
  position: number
  clicks: number
  impressions: number
  ctr: number
  page: string
  score: number         // Score de priorité (impressions × (21 - position))
  type: 'conquest'      // Page 2, fort volume → à conquérir
      | 'defend'        // Page 1 en chute → à défendre
      | 'rewrite'       // Faible CTR → à réécrire
}

/**
 * Create an authenticated Google Search Console client via Service Account.
 * Priority: encrypted DB > disk file (legacy fallback).
 */
async function createGscClient() {
  const { google } = await import('googleapis')
  const scopes = ['https://www.googleapis.com/auth/webmasters.readonly']

  // 1. DB-First : lire le JSON SA depuis la row globale chiffrée
  let credentials: any = null
  try {
    const json = await readGlobalSecret('gscServiceAccount')
    if (json) credentials = JSON.parse(json)
  } catch (err: any) {
    console.warn('[gsc] Lecture DB secret échouée, fallback fichier:', err?.message)
  }

  if (credentials) {
    const auth = new google.auth.GoogleAuth({ credentials, scopes })
    return google.searchconsole({ version: 'v1', auth })
  }

  // 2. Fallback fichier disque (legacy)
  const keyPath = process.env.GSC_SERVICE_ACCOUNT_PATH
    ?? resolve(process.cwd(), '../secrets/gsc-service-account.json')

  if (existsSync(keyPath)) {
    const fileCreds = JSON.parse(readFileSync(keyPath, 'utf-8'))
    const auth = new google.auth.GoogleAuth({ credentials: fileCreds, scopes })
    return google.searchconsole({ version: 'v1', auth })
  }

  throw new Error('[gsc] Aucun Service Account configuré (DB row _global.secrets.gscServiceAccount absent ET fichier disque introuvable)')
}

/**
 * Retrieve SEO conquest opportunities:
 * - Keywords at positions 11-20 (page 2) with impressions
 * - Sorted by score = impressions × (21 - position)
 *
 * @param siteUrl - URL du site GSC (obligatoire — résolu par le caller depuis la config tenant)
 * @param days - Nombre de jours à analyser (défaut: 28)
 * @param limit - Nombre max de résultats (défaut: 20)
 */
export async function getTopOpportunities(
  siteUrl?: string,
  days = 28,
  limit = 20
): Promise<GscOpportunity[]> {
  const site = siteUrl ?? ''
  if (!site) return []

  try {
    const gsc = await createGscClient()
    const endDate = new Date().toISOString().slice(0, 10)
    const startDate = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)

    // Requête page 2 (position 11-20) avec volume
    const response = await gsc.searchanalytics.query({
      siteUrl: site,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['query', 'page'],
        dimensionFilterGroups: [{
          filters: [{
            dimension: 'query',
            operator: 'notContains',
            expression: 'alexandre carette',  // Exclure les requêtes de marque
          }],
        }],
        rowLimit: 500,
        startRow: 0,
      },
    })

    const rows = response.data.rows ?? []

    const opportunities: GscOpportunity[] = rows
      .filter(r => {
        const pos = r.position ?? 0
        return pos >= 8 && pos <= 25 && (r.impressions ?? 0) >= 10
      })
      .map(r => {
        const position = Math.round(r.position ?? 0)
        const impressions = r.impressions ?? 0
        const clicks = r.clicks ?? 0
        const ctr = r.ctr ?? 0

        // Déterminer le type
        let type: GscOpportunity['type'] = 'conquest'
        if (position <= 10 && ctr < 0.02) type = 'rewrite'  // Page 1 mais CTR < 2%
        else if (position <= 10) type = 'defend'

        return {
          query: (r.keys?.[0] ?? '').trim(),
          position,
          clicks,
          impressions,
          ctr: Math.round(ctr * 10000) / 100,
          page: (r.keys?.[1] ?? '').trim(),
          score: Math.round(impressions * (25 - position)),
          type,
        }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)

    console.log(`[gsc] ${opportunities.length} opportunités trouvées (${days}j, site: ${site})`)
    return opportunities
  } catch (err: any) {
    console.warn(`[gsc] Erreur API GSC (non-bloquant):`, err?.message?.slice(0, 200))
    return []
  }
}

/**
 * Retrieve total organic traffic over a period (clicks + impressions).
 * Used for asset valuation (asset-value) — the SEO value
 * of a site is based on its organic traffic flow over a rolling 12-month period.
 *
 * Return `{ clicks: 0, impressions: 0 }` if Google Search Console is unavailable (the caller
 * then displays the SEO component as 0 in the valuation range).
 */
export async function getTotalTraffic(
  siteUrl?: string,
  days = 365,
): Promise<{ clicks: number; impressions: number; days: number }> {
  const site = siteUrl ?? ''
  if (!site) return { clicks: 0, impressions: 0, days }

  try {
    const gsc = await createGscClient()
    const endDate = new Date().toISOString().slice(0, 10)
    const startDate = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)

    const response = await gsc.searchanalytics.query({
      siteUrl: site,
      requestBody: { startDate, endDate, dimensions: [], rowLimit: 1 },
    })

    const row = response.data.rows?.[0]
    return {
      clicks: Math.round(row?.clicks ?? 0),
      impressions: Math.round(row?.impressions ?? 0),
      days,
    }
  } catch (err: any) {
    console.warn('[gsc] getTotalTraffic non-bloquant:', err?.message?.slice(0, 200))
    return { clicks: 0, impressions: 0, days }
  }
}

/**
 * Retrieve high-traffic pages losing positions (defend).
 */
export async function getDecliningPages(
  siteUrl?: string,
  limit = 10
): Promise<GscOpportunity[]> {
  // Compare les 14 derniers jours vs les 14 jours d'avant
  const site = siteUrl ?? ''
  if (!site) return []

  try {
    const gsc = await createGscClient()
    const now = new Date()

    const recentEnd = now.toISOString().slice(0, 10)
    const recentStart = new Date(now.getTime() - 14 * 86400000).toISOString().slice(0, 10)
    const prevEnd = recentStart
    const prevStart = new Date(now.getTime() - 28 * 86400000).toISOString().slice(0, 10)

    const [recent, previous] = await Promise.all([
      gsc.searchanalytics.query({
        siteUrl: site,
        requestBody: { startDate: recentStart, endDate: recentEnd, dimensions: ['page'], rowLimit: 100 },
      }),
      gsc.searchanalytics.query({
        siteUrl: site,
        requestBody: { startDate: prevStart, endDate: prevEnd, dimensions: ['page'], rowLimit: 100 },
      }),
    ])

    const prevMap = new Map<string, number>()
    for (const r of previous.data.rows ?? []) {
      prevMap.set(r.keys?.[0] ?? '', r.clicks ?? 0)
    }

    const declining = (recent.data.rows ?? [])
      .filter(r => {
        const page = r.keys?.[0] ?? ''
        const prevClicks = prevMap.get(page) ?? 0
        const currentClicks = r.clicks ?? 0
        return prevClicks > 5 && currentClicks < prevClicks * 0.7  // -30% de clics
      })
      .map(r => ({
        query: '',
        position: Math.round(r.position ?? 0),
        clicks: r.clicks ?? 0,
        impressions: r.impressions ?? 0,
        ctr: Math.round((r.ctr ?? 0) * 10000) / 100,
        page: (r.keys?.[0] ?? '').trim(),
        score: (r.impressions ?? 0),
        type: 'defend' as const,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)

    return declining
  } catch {
    return []
  }
}
