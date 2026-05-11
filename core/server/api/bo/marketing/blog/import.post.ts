

import { useClientDb } from '~/server/utils/db'
import { requireRoleOrSaas } from '~/server/utils/session'

interface ImportBody {
  rows: Record<string, any>[]
  mapping: {
    id?: string
    linkRewrite?: string
    title?: string
    metaDescription?: string
    categoryId?: string
    active?: string
    indexation?: string
  }
  createMissing?: boolean
}

function toBool(v: any): 0 | 1 | undefined {
  if (v === undefined || v === null || v === '') return undefined
  const s = String(v).trim().toLowerCase()
  if (['1', 'true', 'oui', 'yes', 'y', 'actif', 'en ligne', 'online'].includes(s)) return 1
  if (['0', 'false', 'non', 'no', 'n', 'inactif', 'draft', 'brouillon'].includes(s)) return 0
  return undefined
}

function slugify(input: string): string {
  const raw = String(input || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
  return raw
    .split('--')
    .map(seg => seg.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''))
    .filter(Boolean)
    .join('--')
    .slice(0, 128)
}

export default defineEventHandler(async (event) => {
  requireRoleOrSaas(event, ['root', 'founder', 'market'])

  const body = await readBody<ImportBody>(event)
  if (!body || !Array.isArray(body.rows)) {
    throw createError({ statusCode: 400, message: 'Body invalide : rows manquant' })
  }
  const mapping = body.mapping || {}
  if (!mapping.id && !mapping.linkRewrite) {
    throw createError({ statusCode: 400, message: 'Mapping minimal requis : ID ou URL' })
  }

  const db = useClientDb(event)
  const stats = {
    total: body.rows.length,
    updated: 0,
    created: 0,
    skipped: 0,
    errors: [] as Array<{ row: number; reason: string }>,
  }

  for (let i = 0; i < body.rows.length; i++) {
    const row = body.rows[i]
    const pick = (field?: string) => (field && row[field] !== undefined ? row[field] : undefined)

    const idRaw = pick(mapping.id)
    const linkRaw = pick(mapping.linkRewrite)
    const title = pick(mapping.title)
    const metaDesc = pick(mapping.metaDescription)
    const catRaw = pick(mapping.categoryId)
    const active = toBool(pick(mapping.active))
    const indexation = toBool(pick(mapping.indexation))

    try {
      
      let existingId: number | null = null
      let existingCat: number | null = null
      if (idRaw && !Number.isNaN(Number(idRaw))) {
        const r = await db.get<any>(
          `SELECT id_cms, id_cms_category FROM ps_cms WHERE id_cms = ? LIMIT 1`,
          [Number(idRaw)],
        )
        if (r?.id_cms) { existingId = Number(r.id_cms); existingCat = Number(r.id_cms_category) }
      }
      if (!existingId && linkRaw && String(linkRaw).trim()) {
        const slug = slugify(String(linkRaw))
        const r = await db.get<any>(
          `SELECT c.id_cms, c.id_cms_category FROM ps_cms c
           JOIN ps_cms_lang cl ON cl.id_cms = c.id_cms AND cl.id_lang = 1
           WHERE cl.link_rewrite = ? LIMIT 1`,
          [slug],
        )
        if (r?.id_cms) { existingId = Number(r.id_cms); existingCat = Number(r.id_cms_category) }
      }

      if (existingId) {
        
        if (existingCat === 1) {
          stats.skipped++
          stats.errors.push({ row: i + 1, reason: `article #${existingId} en racine (landing) — ignoré` })
          continue
        }

        
        const cf: string[] = []
        const cp: any[] = []
        if (catRaw !== undefined && !Number.isNaN(Number(catRaw))) {
          const newCat = Number(catRaw)
          if (newCat > 0 && newCat !== 1) { cf.push('id_cms_category = ?'); cp.push(newCat) }
        }
        if (active !== undefined) { cf.push('active = ?'); cp.push(active) }
        if (indexation !== undefined) { cf.push('indexation = ?'); cp.push(indexation) }
        if (cf.length) {
          await db.run(`UPDATE ps_cms SET ${cf.join(', ')} WHERE id_cms = ?`, [...cp, existingId])
        }

        
        const lf: string[] = []
        const lp: any[] = []
        if (title !== undefined) { lf.push('meta_title = ?'); lp.push(String(title).trim().slice(0, 255)) }
        if (metaDesc !== undefined) { lf.push('meta_description = ?'); lp.push(String(metaDesc).trim().slice(0, 512)) }
        if (linkRaw !== undefined) {
          const slug = slugify(String(linkRaw))
          if (slug) { lf.push('link_rewrite = ?'); lp.push(slug) }
        }
        if (lf.length) {
          await db.run(
            `UPDATE ps_cms_lang SET ${lf.join(', ')} WHERE id_cms = ? AND id_lang = 1`,
            [...lp, existingId],
          )
        }
        stats.updated++
      } else if (body.createMissing) {
        const t = title ? String(title).trim() : ''
        const cat = Number(catRaw) || 0
        if (!t) {
          stats.skipped++
          stats.errors.push({ row: i + 1, reason: 'titre requis pour créer' })
          continue
        }
        if (cat <= 0 || cat === 1) {
          stats.skipped++
          stats.errors.push({ row: i + 1, reason: 'catégorie de blog (≠ 1) requise pour créer' })
          continue
        }
        const slug = slugify(linkRaw ? String(linkRaw) : t)
        if (!slug) {
          stats.skipped++
          stats.errors.push({ row: i + 1, reason: 'slug impossible à générer' })
          continue
        }
        
        const dup = await db.get<any>(
          `SELECT c.id_cms FROM ps_cms c
           JOIN ps_cms_lang cl ON cl.id_cms = c.id_cms AND cl.id_lang = 1
           WHERE cl.link_rewrite = ? LIMIT 1`,
          [slug],
        )
        if (dup) {
          stats.skipped++
          stats.errors.push({ row: i + 1, reason: `slug déjà utilisé (#${dup.id_cms})` })
          continue
        }

        const ins = await db.run(
          `INSERT INTO ps_cms (id_cms_category, position, active, indexation) VALUES (?, 0, ?, ?)`,
          [cat, active ?? 0, indexation ?? 1],
        )
        const newId = Number(ins.insertId || 0)
        if (!newId) throw new Error('id_cms introuvable après INSERT')

        const langs = await db.query<any>(`SELECT id_lang FROM ps_lang WHERE active = 1`)
        for (const l of langs) {
          await db.run(
            `INSERT INTO ps_cms_lang
              (id_cms, id_lang, id_shop, meta_title, head_seo_title, meta_description, content, link_rewrite)
             VALUES (?, ?, 1, ?, '', ?, '', ?)`,
            [
              newId, Number(l.id_lang),
              t.slice(0, 255),
              metaDesc ? String(metaDesc).trim().slice(0, 512) : '',
              slug,
            ],
          )
        }
        stats.created++
      } else {
        stats.skipped++
      }
    } catch (err: any) {
      stats.errors.push({ row: i + 1, reason: err.message || String(err) })
    }
  }

  return { success: true, stats }
})
