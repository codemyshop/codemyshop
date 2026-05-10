/**
 *
 * PUT /api/megamenu/sync
 *
 * Receives the complete menu in builder format (root items with children/megaMenu)
 * and synchronizes it in the DB. DELETE (CASCADE on cs_megamenu_lang via FK)
 * then INSERT non-i18n items via the facade, then INSERT translations
 * par langue active.
 *
 * The builder can send:
 * label: "Accueil"                        (string — applied to all active languages)
 * label: { fr: "Accueil", en: "Home" }    (dict — one value per iso_code, fallback fr)
 */
import { useClientDb } from '~/server/utils/db'
import {
  deleteMegamenuForClient,
  insertMegamenuRow,
  upsertMegamenuLangRow,
} from '~/modules/megamenu/server/utils/megamenu'

interface BuilderMenuLink {
  label: string | Record<string, string>
  href: string
  description?: string | Record<string, string>
  badge?: string | Record<string, string>
  psId?: number
  psCategoryId?: number
  showPsChildren?: boolean
}

interface BuilderMegaColumn {
  title?: string | Record<string, string>
  icon?: string
  links: BuilderMenuLink[]
}

interface BuilderMenuItem {
  label: string | Record<string, string>
  href?: string
  isMegaMenu?: boolean
  megaMenu?: BuilderMegaColumn[]
  children?: BuilderMenuLink[]
  bgColor?: string
  textColor?: string
  style?: Record<string, string>
  highlight?: boolean
  rightAlign?: boolean
  align?: string
  cssClass?: string
  external?: boolean
  badge?: string | Record<string, string>
  badgeBg?: string
  badgeColor?: string
}

function buildStyleJson(item: BuilderMenuItem): string | null {
  const style: Record<string, string> = item.style ? { ...item.style } : {}
  if (item.bgColor) {
    style.backgroundColor = item.bgColor
    style.color = item.textColor || '#fff'
  }
  if (item.badgeBg) style.badgeBg = item.badgeBg
  if (item.badgeColor) style.badgeColor = item.badgeColor
  return Object.keys(style).length ? JSON.stringify(style) : null
}

function resolveLangValue(raw: string | Record<string, string> | undefined | null, iso: string): string | null {
  if (raw === null || raw === undefined || raw === '') return null
  if (typeof raw === 'string') return raw
  if (typeof raw === 'object') {
    const v = raw[iso] ?? raw.fr
    if (v) return v
    for (const k of Object.keys(raw)) {
      if (raw[k]) return raw[k]
    }
    return null
  }
  return null
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{ items: BuilderMenuItem[] }>(event)
  if (!body?.items || !Array.isArray(body.items)) {
    throw createError({ statusCode: 400, message: 'items[] requis' })
  }

  const db = useClientDb(event)
  const { clientId } = db

  // Charger les langues actives du tenant (raw — ps_lang PS native, pas dans Drizzle).
  const langs = await db.query<{ id_lang: number; iso_code: string }>(
    `SELECT id_lang, iso_code FROM ps_lang WHERE active = 1`,
  )
  if (!langs.length) {
    throw createError({ statusCode: 500, message: 'Aucune langue active sur le tenant' })
  }

  async function insertLangRows(
    idMegamenu: number,
    label: string | Record<string, string>,
    description: string | Record<string, string> | null,
    badge: string | Record<string, string> | null,
    groupTitle: string | Record<string, string> | null,
  ) {
    for (const l of langs) {
      const lbl = resolveLangValue(label, l.iso_code) ?? ''
      const dsc = resolveLangValue(description, l.iso_code)
      const bdg = resolveLangValue(badge, l.iso_code)
      const grp = resolveLangValue(groupTitle, l.iso_code)
      await upsertMegamenuLangRow(idMegamenu, l.id_lang, lbl, dsc, bdg, grp, { event })
    }
  }

  // DELETE all existing items for this client — CASCADE drop _lang via FK
  await deleteMegamenuForClient(clientId, { event })

  if (!body.items.length) {
    return { ok: true, count: 0 }
  }

  const rootItems: { id: number; type: 'link' | 'megamenu' | 'dropdown'; item: BuilderMenuItem }[] = []
  let pos = 0
  for (const item of body.items) {
    const rootType = item.isMegaMenu ? 'megamenu'
      : (item.megaMenu?.length || item.children?.length) ? 'dropdown'
      : 'link'
    const cssClass = (item.rightAlign || item.align === 'right') ? 'ml-auto' : (item.cssClass || null)
    const rootStyle = buildStyleJson(item)
    const gridCols = rootType === 'megamenu' ? (item.megaMenu?.length || null) : null

    const insertId = await insertMegamenuRow({
      clientId,
      parentId: null,
      type: rootType,
      href: item.href || null,
      icon: null,
      styleJson: rootStyle,
      gridColumns: gridCols,
      cssClass,
      psCategoryId: null,
      showPsChildren: 0,
      position: pos++,
    }, { event })
    await insertLangRows(insertId, item.label, null, item.badge || null, null)
    rootItems.push({ id: insertId, type: rootType, item })
  }

  for (const { id: parentId, type: rootType, item } of rootItems) {
    if (rootType === 'megamenu' && item.megaMenu?.length) {
      // Position GLOBALE monotone — ne pas reset à chaque colonne sinon les
      // positions [0..N] de chaque colonne se chevauchent et `ORDER BY
      // parent_id, position` mélange les colonnes au reload (incidents
      // 2026-05-04 — Alex « la position des colonnes ne persiste pas »).
      // L'ordre des colonnes est porté par `group_title` côté GET (groupes
      // créés par ordre d'apparition des children triés par position).
      let childPos = 0
      for (const col of item.megaMenu) {
        for (const link of col.links) {
          const insertId = await insertMegamenuRow({
            clientId,
            parentId,
            type: 'link',
            href: link.href,
            icon: col.icon || null,
            psCategoryId: link.psCategoryId || null,
            showPsChildren: link.showPsChildren ? 1 : 0,
            position: childPos++,
          }, { event })
          await insertLangRows(insertId, link.label, link.description || null, link.badge || null, col.title || null)
        }
      }
    } else if (rootType === 'dropdown') {
      const links = item.megaMenu?.flatMap((c) => c.links) || item.children || []
      let childPos = 0
      for (const link of links) {
        const insertId = await insertMegamenuRow({
          clientId,
          parentId,
          type: 'link',
          href: link.href,
          psCategoryId: link.psCategoryId || null,
          showPsChildren: link.showPsChildren ? 1 : 0,
          position: childPos++,
        }, { event })
        await insertLangRows(insertId, link.label, link.description || null, link.badge || null, null)
      }
    }
  }

  return { ok: true, count: rootItems.length }
})
