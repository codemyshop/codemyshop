

import { useClientDb } from '~/server/utils/db'
import { loadSiloSlugMapForLang, localizeSiloHref } from '~/server/utils/localize-silo-href'
import { ensureTrailingSlash, isCategoryHref } from '~/server/utils/category-url'

interface MegamenuRow {
  id_megamenu: number
  client_id: string
  parent_id: number | null
  type: 'link' | 'megamenu' | 'dropdown'
  label: string | null
  label_fr: string | null
  href: string | null
  icon: string | null
  description: string | null
  description_fr: string | null
  badge: string | null
  badge_fr: string | null
  group_title: string | null
  group_title_fr: string | null
  style_json: string | null
  grid_columns: number | null
  css_class: string | null
  ps_category_id: number | null
  show_ps_children: number
  position: number
}

interface PsChildCategory {
  id: number
  name: string
  slug: string
  href: string
  psChildren?: PsChildCategory[]
}

export interface MegamenuItem {
  id: number
  type: 'link' | 'megamenu' | 'dropdown'
  label: Record<string, string>
  href: string | null
  icon: string | null
  description: string | null
  badge: string | null
  groupTitle: string | null
  style: Record<string, string> | null
  gridColumns: number | null
  cssClass: string | null
  psCategoryId: number | null
  showPsChildren: boolean
  position: number
  children: MegamenuItem[]
  psChildren: PsChildCategory[]
}

function parseJson(raw: string | null): any {
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

function rowToItem(row: MegamenuRow): MegamenuItem {
  const label       = row.label       ?? row.label_fr       ?? ''
  const description = row.description ?? row.description_fr ?? null
  const badge       = row.badge       ?? row.badge_fr       ?? null
  const groupTitle  = row.group_title ?? row.group_title_fr ?? null

  
  
  
  const normHref = isCategoryHref(row.href) ? ensureTrailingSlash(row.href) : row.href

  return {
    id: row.id_megamenu,
    type: row.type,
    label: { fr: label },
    href: normHref,
    icon: row.icon,
    description,
    badge,
    groupTitle,
    style: parseJson(row.style_json),
    gridColumns: row.grid_columns,
    cssClass: row.css_class,
    psCategoryId: row.ps_category_id,
    showPsChildren: !!row.show_ps_children,
    position: row.position,
    children: [],
    psChildren: [],
  }
}

export default defineEventHandler(async (event) => {
  const db = useClientDb(event)
  const { resolveIdLang } = await import('~/server/utils/lang')
  const idLang = await resolveIdLang(event)

  try {
    const { loadMegamenuTreeRows } = await import('~/modules/megamenu/server/utils/megamenu')
    const items = await loadMegamenuTreeRows(db.clientId, idLang, { event })
    
    const rows: MegamenuRow[] = items.map((r) => ({
      id_megamenu: r.idMegamenu,
      client_id: r.clientId,
      parent_id: r.parentId,
      type: r.type,
      href: r.href,
      icon: r.icon,
      style_json: r.styleJson,
      grid_columns: r.gridColumns,
      css_class: r.cssClass,
      ps_category_id: r.psCategoryId,
      show_ps_children: r.showPsChildren,
      position: r.position,
      label: r.label,
      description: r.description,
      badge: r.badge,
      group_title: r.groupTitle,
      label_fr: r.labelFr,
      description_fr: r.descriptionFr,
      badge_fr: r.badgeFr,
      group_title_fr: r.groupTitleFr,
    }))

    const byId = new Map<number, MegamenuItem>()
    const roots: MegamenuItem[] = []

    for (const row of rows) {
      const item = rowToItem(row)
      byId.set(row.id_megamenu, item)
    }

    for (const row of rows) {
      const item = byId.get(row.id_megamenu)!
      if (row.parent_id === null) {
        roots.push(item)
      } else {
        const parent = byId.get(row.parent_id)
        if (parent) {
          parent.children.push(item)
        }
      }
    }

    
    const expandableItems = [...byId.values()].filter(i => i.showPsChildren && i.psCategoryId)
    if (expandableItems.length > 0) {
      const categoryIds = expandableItems.map(i => i.psCategoryId!)
      const placeholders = categoryIds.map(() => '?').join(',')

      
      
      const psChildren = await db.query<{
        id_category: number
        name: string
        link_rewrite: string
        id_parent: number
        position: number
      }>(
        `SELECT c.id_category,
                COALESCE(cl.name,         clf.name, '')         AS name,
                COALESCE(clf.link_rewrite, '')                  AS link_rewrite,
                c.id_parent, c.position
           FROM ps_category c
      LEFT JOIN ps_category_lang cl  ON cl.id_category  = c.id_category AND cl.id_lang = ? AND cl.id_shop = 1
      LEFT JOIN ps_category_lang clf ON clf.id_category = c.id_category AND clf.id_lang = 1 AND clf.id_shop = 1
          WHERE c.id_parent IN (${placeholders}) AND c.active = 1
            AND (
              c.id_category IN (390, 391, 392)
              OR EXISTS (
                SELECT 1 FROM ps_product p
                JOIN ps_category_product cp ON cp.id_product = p.id_product
                JOIN ps_category d ON d.id_category = cp.id_category AND d.active = 1
                WHERE p.active = 1 AND d.nleft BETWEEN c.nleft AND c.nright
              )
            )
          ORDER BY c.id_parent, c.position`,
        [idLang, ...categoryIds],
      )

      const parentHrefMap = new Map<number, string>()
      for (const item of expandableItems) {
        parentHrefMap.set(item.psCategoryId!, item.href || '')
      }

      const childrenByParent = new Map<number, PsChildCategory[]>()
      for (const row of psChildren) {
        if (!childrenByParent.has(row.id_parent)) childrenByParent.set(row.id_parent, [])
        const parentHref = (parentHrefMap.get(row.id_parent) || '').replace(/\/+$/, '')
        const slug = row.link_rewrite
        childrenByParent.get(row.id_parent)!.push({
          id: row.id_category,
          name: row.name,
          slug,
          href: `${parentHref}/${slug}/`,
        })
      }

      
      const childCategoryIds = psChildren.map(r => r.id_category)
      if (childCategoryIds.length > 0) {
        const gcPlaceholders = childCategoryIds.map(() => '?').join(',')
        const grandchildren = await db.query<{
          id_category: number
          name: string
          link_rewrite: string
          id_parent: number
          position: number
        }>(
          `SELECT c.id_category,
                  COALESCE(cl.name,         clf.name, '')         AS name,
                  COALESCE(clf.link_rewrite, '')                  AS link_rewrite,
                  c.id_parent, c.position
             FROM ps_category c
        LEFT JOIN ps_category_lang cl  ON cl.id_category  = c.id_category AND cl.id_lang = ? AND cl.id_shop = 1
        LEFT JOIN ps_category_lang clf ON clf.id_category = c.id_category AND clf.id_lang = 1 AND clf.id_shop = 1
            WHERE c.id_parent IN (${gcPlaceholders}) AND c.active = 1
              AND (
                c.id_category IN (390, 391, 392)
                OR EXISTS (
                  SELECT 1 FROM ps_product p
                  JOIN ps_category_product cp ON cp.id_product = p.id_product
                  JOIN ps_category d ON d.id_category = cp.id_category AND d.active = 1
                  WHERE p.active = 1 AND d.nleft BETWEEN c.nleft AND c.nright
                )
              )
            ORDER BY c.id_parent, c.position`,
          [idLang, ...childCategoryIds],
        )

        const psChildHrefMap = new Map<number, string>()
        for (const children of childrenByParent.values()) {
          for (const child of children) {
            psChildHrefMap.set(child.id, child.href)
          }
        }

        const gcByParent = new Map<number, PsChildCategory[]>()
        for (const row of grandchildren) {
          if (!gcByParent.has(row.id_parent)) gcByParent.set(row.id_parent, [])
          const parentHref = (psChildHrefMap.get(row.id_parent) || '').replace(/\/+$/, '')
          const slug = row.link_rewrite
          gcByParent.get(row.id_parent)!.push({
            id: row.id_category,
            name: row.name,
            slug,
            href: `${parentHref}/${slug}/`,
          })
        }

        for (const children of childrenByParent.values()) {
          for (const child of children) {
            const gc = gcByParent.get(child.id)
            if (gc?.length) child.psChildren = gc
          }
        }
      }

      
      for (const item of expandableItems) {
        const raw = childrenByParent.get(item.psCategoryId!) || []
        const existingHrefs = new Set(item.children.map(c => c.href?.replace(/\/+$/, '')))
        const existingNames = new Set(item.children.map(c => {
          const l = c.label as Record<string, string>
          return (l?.fr || Object.values(l)[0] || '').toLowerCase()
        }))
        item.psChildren = raw.filter(ps => {
          const hrefNorm = ps.href.replace(/\/+$/, '')
          const nameNorm = ps.name.toLowerCase()
          if (existingHrefs.has(hrefNorm)) return false
          if (existingNames.has(nameNorm)) return false
          return true
        })
        const seenIds = new Set<number>()
        const seenNames = new Set<string>()
        item.psChildren = item.psChildren.filter(ps => {
          const nameKey = ps.name.toLowerCase()
          if (seenIds.has(ps.id) || seenNames.has(nameKey)) return false
          seenIds.add(ps.id)
          seenNames.add(nameKey)
          return true
        })
      }
    }

    
    
    
    if (idLang !== 1) {
      const slugMap = await loadSiloSlugMapForLang(idLang)
      const walk = (items: MegamenuItem[]) => {
        for (const it of items) {
          if (it.href) it.href = localizeSiloHref(it.href, slugMap)
          if (it.psChildren?.length) {
            for (const pc of it.psChildren) {
              pc.href = localizeSiloHref(pc.href, slugMap) || pc.href
              if (pc.psChildren?.length) {
                for (const gc of pc.psChildren) {
                  gc.href = localizeSiloHref(gc.href, slugMap) || gc.href
                }
              }
            }
          }
          if (it.children.length) walk(it.children)
        }
      }
      walk(roots)
    }

    return { items: roots }
  } catch (err: any) {
    if (err?.code === 'ER_NO_SUCH_TABLE' || err?.errno === 1146) {
      return { items: [] }
    }
    console.error('[megamenu] DB error:', err?.message)
    throw createError({ statusCode: 500, message: 'Erreur chargement menu' })
  }
})
