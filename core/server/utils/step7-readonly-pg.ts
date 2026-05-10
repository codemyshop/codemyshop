/**
 *
 * Read-only PG facades for step 7 of workstream #38.
 *
 * 20 tables from the legacy system were migrated to PG (bucket A, no writer code detected).
 * This module exposes PG facades for the 3 Nuxt hot paths currently
 * wired via flag PG_ENABLED_DOMAINS:
 *   - crosslinks                (flag : crosslinks)
 *   - page_meta                 (flag : page_meta)
 *   - moduleslist               (flag : moduleslist, via api/moduleslist.get.ts)
 *
 * marketplace_feature remains on MariaDB for now: its Nuxt facade is
 * tenant-aware (useClientDrizzle) and the PG cs_main contains only
 * the legacy system version. Wiring deferred to phase 2 (tenant tables in PG).
 *
 * The 16 other tables (academy_*, tools, reunions, routing_*, corbie,
 * telemetry, lot_order_detail, price_contract, dictionary, bot_hits,
 * marketplace_design_system, translate_profile) are ready on the PG side
 * (DDL + snapshot) but not yet wired — their Nuxt cutover will be
 * done case-by-case when their consumer is touched.
 */

import { sql } from 'drizzle-orm'
import { usePocPg } from '../db/drizzle-pg'

export interface CrosslinkPgRow {
  id_crosslink: number
  link_rewrite: string
  title: string
  url: string
  pilier: string
  sous_cat: string
  same_subcat: string | null
  same_pillar: string | null
  cross_pillar: string | null
}

export async function listAllCrosslinksPg(): Promise<CrosslinkPgRow[]> {
  const result = await usePocPg().execute<any>(sql`
    SELECT id_crosslink, link_rewrite, title, url, pilier, sous_cat,
           same_subcat, same_pillar, cross_pillar
      FROM cs_main.cs_crosslinks
  `)
  return ((result as any) as any[]).map((r) => ({
    id_crosslink: Number(r.id_crosslink),
    link_rewrite: String(r.link_rewrite),
    title: String(r.title),
    url: String(r.url),
    pilier: String(r.pilier),
    sous_cat: String(r.sous_cat),
    same_subcat: r.same_subcat,
    same_pillar: r.same_pillar,
    cross_pillar: r.cross_pillar,
  }))
}

export interface PageMetaPgRow {
  title: string | null
  description: string | null
  keywords: string | null
  og_title: string | null
  og_description: string | null
  og_image: string | null
  og_type: string | null
  jsonld_type: string | null
  jsonld_extra: string | null
  layout: string
  hero_eyebrow: string | null
  hero_title: string | null
  hero_subtitle: string | null
  hero_icon: string | null
  hero_stats: string | null
  cta_primary_label: string | null
  cta_primary_link: string | null
  cta_secondary_label: string | null
  cta_secondary_link: string | null
  content_source: string | null
  css_accent: string | null
}

export async function getActivePageMetaPg(route: string): Promise<PageMetaPgRow | null> {
  const result = await usePocPg().execute<any>(sql`
    SELECT title, description, keywords, og_title, og_description, og_image,
           og_type, jsonld_type, jsonld_extra, layout,
           hero_eyebrow, hero_title, hero_subtitle, hero_icon, hero_stats,
           cta_primary_label, cta_primary_link,
           cta_secondary_label, cta_secondary_link,
           content_source, css_accent
      FROM cs_main.cs_page_meta
     WHERE route = ${route} AND active = 1
     LIMIT 1
  `)
  const rows = (result as any) as any[]
  return rows.length ? (rows[0] as PageMetaPgRow) : null
}

export interface ModuleslistPgRow {
  name: string
  codename: string
  icon: string | null
  category: string
  flywheel: string | null
  description: string
  features: string | null
  tags: string | null
  status: string
  link: string | null
  position: number
}

export async function listActiveModuleslistPg(): Promise<ModuleslistPgRow[]> {
  const result = await usePocPg().execute<any>(sql`
    SELECT name, codename, icon, category, flywheel, description,
           features, tags, status, link, position
      FROM cs_main.cs_moduleslist
     WHERE active = 1
     ORDER BY position ASC
  `)
  return ((result as any) as any[]).map((r) => ({
    name: String(r.name || ''),
    codename: String(r.codename || ''),
    icon: r.icon,
    category: String(r.category || 'general'),
    flywheel: r.flywheel,
    description: String(r.description || ''),
    features: r.features,
    tags: r.tags,
    status: String(r.status || 'Production'),
    link: r.link,
    position: Number(r.position || 0),
  }))
}

