/**
 *
 * PUT /api/homepage-config/sync — UPSERT homepage (normalized #205 Phase 2,
 * master cs_homepage dropped #200).
 *
 * Persiste `body.homepage` (hero, features, personas, categories, testimonials,
 * about, blog, faq, malt) in cs_homepage_section + cs_homepage_block
 * (+ _lang). Strategy: purge + re-insert, exact mirror of
 * `synedre/archive/hp_normalize_205.py`.
 *
 * Mono-lang FR (id_lang=1) — consistent with the Phase 1 migration. The i18n
 * multi-lang will go through a translation automation system like the other modules.
 *
 * `body.sections` (historical ordering/visibility) is ignored — this state
 * lives on the front end (DEFAULT_SECTIONS in clients/example/pages/index.vue).
 */
import { resolveClientId } from '~/server/utils/db'
import {
  wipeHomepage,
  insertSection,
  insertSectionLang,
} from '~/modules/homepage-section/server/utils/homepage-section'
import {
  insertBlock,
  insertBlockLang,
  type BlockLangField,
} from '~/modules/homepage-block/server/utils/homepage-block'

const SECTION_ORDER = ['hero', 'features', 'personas', 'categories', 'testimonials', 'about', 'blog', 'faq', 'malt'] as const
const ID_LANG = 1

export default defineEventHandler(async (event) => {
  // ── GUARD TENANT : AC-HUB ONLY ──────────────────────────────────────────
  // Cet endpoint est un RESET complet (WIPE + reseed via SECTION_ORDER AC-only).
  // Appelé par erreur sur un tenant (ex: SMOKE v2) il détruit tout le contenu
  // tenant-spécifique puis recrée les sections AC (personas/about/malt que les
  // tenants n'utilisent pas). Cicatrice 2026-04-22 : wipe accidentel SMOKE via
  // ac_builder. Lock au clientId 'ac-hub' (legacy endpoint de migration #205,
  // n'a plus lieu d'être appelé hors AC).
  const clientId = resolveClientId(event)
  if (clientId !== 'ac-hub') {
    throw createError({
      statusCode: 403,
      message: `sync.put bloqué pour tenant='${clientId}' — endpoint AC-hub only. Utiliser PUT /api/homepage-sections/:id pour les updates partiels.`,
    })
  }

  const body = await readBody<{ homepage: any; sections?: any }>(event)
  if (!body?.homepage) throw createError({ statusCode: 400, message: 'homepage requis' })

  // Anti-wipe : refuser si le payload ne contient pas au minimum un hero.
  // Un homepage vide après WIPE = page blanche, jamais voulu.
  const h = body.homepage
  if (!h.hero || typeof h.hero !== 'object') {
    throw createError({
      statusCode: 400,
      message: 'body.homepage.hero requis — wipe refusé pour éviter une homepage vide.',
    })
  }

  // 1. Purge sections/blocks existants (single homepage AC, pas de FK client_id
  //    sur cs_homepage_section — tenant-scoped par useClientDb).
  //    Guard ci-dessus garantit qu'on est bien sur la DB AC, pas un tenant.
  await wipeHomepage({ event })

  // 2. Re-insert miroir du script de migration
  for (let i = 0; i < SECTION_ORDER.length; i++) {
    const name = SECTION_ORDER[i]
    const data = h[name]
    await insertSectionByType(event, i + 1, name, data)
  }

  return { ok: true }
})

// ─── Mappers par section-type (miroir de hp_normalize_205.py) ──────────────

async function insertSectionByType(event: any, position: number, name: string, data: any): Promise<void> {
  switch (name) {
    case 'hero':         return migrateHero(event, position, data)
    case 'features':     return migrateFeatures(event, position, data)
    case 'personas':     return migratePersonas(event, position, data)
    case 'categories':   return migrateEmpty(event, position, 'categories')
    case 'testimonials': return migrateEmpty(event, position, 'testimonials')
    case 'about':        return migrateAbout(event, position, data)
    case 'blog':         return migrateBlog(event, position, data)
    case 'faq':          return migrateFaq(event, position, data)
    case 'malt':         return migrateMalt(event, position, data)
  }
}

async function migrateHero(event: any, position: number, data: any): Promise<void> {
  if (!data) return
  const cta = data.cta || {}
  const cta2 = data.cta2 || {}
  const quote = data.quote || {}
  const secId = await insertSection({ position, type: 'hero', cta_href: cta.href ?? null }, { event })
  await insertSectionLang(secId, ID_LANG, data.title ?? null, data.subtitle ?? null, { event })

  const extra = data.layout ? { layout: data.layout } : null
  const blockId = await insertBlock({
    id_section: secId,
    block_kind: 'hero-meta',
    position: 1,
    image: data.image ?? null,
    href: cta2.href ?? null,
    extra_config_json: extra ? JSON.stringify(extra) : null,
  }, { event })
  await insertBlockLang(blockId, ID_LANG, {
    sticker: data.badge,
    cta_label: cta.label,
    header: cta2.label,
    text: quote.text,
    footer: quote.author,
    alt: data.image,
  }, { event })

  const tags = Array.isArray(data.tags) ? data.tags : []
  for (let i = 0; i < tags.length; i++) {
    const tId = await insertBlock({ id_section: secId, block_kind: 'tag', position: i + 1 }, { event })
    await insertBlockLang(tId, ID_LANG, { label: tags[i] } as Partial<Record<BlockLangField, any>>, { event })
  }
}

async function migrateFeatures(event: any, position: number, data: any): Promise<void> {
  if (!Array.isArray(data) || !data.length) return
  const secId = await insertSection({ position, type: 'features' }, { event })
  await insertSectionLang(secId, ID_LANG, null, null, { event })
  for (let i = 0; i < data.length; i++) {
    const f = data[i]
    const bId = await insertBlock({
      id_section: secId,
      block_kind: 'feature',
      position: i + 1,
      icon: f.icon ?? null,
    }, { event })
    await insertBlockLang(bId, ID_LANG, { label: f.label, description: f.description }, { event })
  }
}

async function migratePersonas(event: any, position: number, data: any): Promise<void> {
  if (!data || !Array.isArray(data.items) || !data.items.length) return
  const secId = await insertSection({ position, type: 'personas' }, { event })
  await insertSectionLang(secId, ID_LANG, data.title ?? null, data.subtitle ?? null, { event })
  for (let i = 0; i < data.items.length; i++) {
    const p = data.items[i]
    const extra = p.color ? { color: p.color } : null
    const pId = await insertBlock({
      id_section: secId,
      block_kind: 'persona',
      position: i + 1,
      image: p.avatar ?? null,
      icon: p.emoji ?? null,
      extra_config_json: extra ? JSON.stringify(extra) : null,
    }, { event })
    await insertBlockLang(pId, ID_LANG, { label: p.name, subtitle: p.role, description: p.situation }, { event })
    const benefits = Array.isArray(p.benefits) ? p.benefits : []
    for (let j = 0; j < benefits.length; j++) {
      const bId = await insertBlock({
        id_section: secId,
        block_kind: 'benefit',
        position: j + 1,
        parent_block_id: pId,
      }, { event })
      await insertBlockLang(bId, ID_LANG, { text: benefits[j] }, { event })
    }
    const tags = Array.isArray(p.tags) ? p.tags : []
    for (let j = 0; j < tags.length; j++) {
      const tId = await insertBlock({
        id_section: secId,
        block_kind: 'tag',
        position: j + 1,
        parent_block_id: pId,
      }, { event })
      await insertBlockLang(tId, ID_LANG, { label: tags[j] } as Partial<Record<BlockLangField, any>>, { event })
    }
  }
}

async function migrateEmpty(event: any, position: number, type_: string): Promise<void> {
  const secId = await insertSection({ position, type: type_ }, { event })
  await insertSectionLang(secId, ID_LANG, null, null, { event })
}

async function migrateAbout(event: any, position: number, data: any): Promise<void> {
  if (!data) return
  const cta = data.cta || {}
  const secId = await insertSection({ position, type: 'about', cta_href: cta.href ?? null }, { event })
  await insertSectionLang(secId, ID_LANG, data.title ?? null, data.subtitle ?? null, { event })
  const paragraphs = Array.isArray(data.paragraphs) ? data.paragraphs : []
  for (let i = 0; i < paragraphs.length; i++) {
    const bId = await insertBlock({ id_section: secId, block_kind: 'paragraph', position: i + 1 }, { event })
    await insertBlockLang(bId, ID_LANG, { text: paragraphs[i] }, { event })
  }
  if (data.mapEmbed || cta.label) {
    const extra = data.mapEmbed ? { mapEmbed: data.mapEmbed } : null
    const bId = await insertBlock({
      id_section: secId,
      block_kind: 'map',
      position: paragraphs.length + 1,
      extra_config_json: extra ? JSON.stringify(extra) : null,
    }, { event })
    await insertBlockLang(bId, ID_LANG, { cta_label: cta.label }, { event })
  }
}

async function migrateBlog(event: any, position: number, data: any): Promise<void> {
  if (!data) return
  const secId = await insertSection({
    position, type: 'blog',
    limit_items: data.limit ?? null,
  }, { event })
  await insertSectionLang(secId, ID_LANG, data.title ?? null, null, { event })
}

async function migrateFaq(event: any, position: number, data: any): Promise<void> {
  if (!data) return
  const secId = await insertSection({ position, type: 'faq' }, { event })
  await insertSectionLang(secId, ID_LANG, data.title ?? null, data.subtitle ?? null, { event })
}

async function migrateMalt(event: any, position: number, data: any): Promise<void> {
  if (!data) return
  const show = data.show !== false
  const secId = await insertSection({ position, type: 'malt', active: show ? 1 : 0 }, { event })
  await insertSectionLang(secId, ID_LANG, null, null, { event })
}
