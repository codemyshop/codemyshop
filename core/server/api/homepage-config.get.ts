/**
 *
 * GET /api/homepage-config
 *
 * Rebuilds the homepage payload (hero, features, personas, categories,
 * testimonials, about, blog, faq, malt) depuis cs_homepage_section +
 * cs_homepage_block (+ _lang) — no more domain-specific JSON columns, no more
 * master cs_homepage (dropped #200).
 *
 * Section ordering + visibility lives on the frontend (index.vue :
 * DEFAULT_SECTIONS). The `sections` field in the response is kept as `null`
 * for backward-compatibility with the signature consumed by useHomepageDb().
 */
import { listSectionsWithLang, type SectionWithLangRow } from '~/modules/homepage-section/server/utils/homepage-section'
import { listBlocksForSections, type BlockWithLangRow } from '~/modules/homepage-block/server/utils/homepage-block'

function extraOf(b: BlockWithLangRow): Record<string, any> {
  try { return b.extra_config_json ? JSON.parse(b.extra_config_json) : {} } catch { return {} }
}

export default defineEventHandler(async (event) => {
  const { resolveIdLang } = await import('~/server/utils/lang')
  const idLang = await resolveIdLang(event)

  try {
    const sections = await listSectionsWithLang(idLang, true, { event })
    if (!sections.length) return { homepage: {}, sections: null }

    const sectionIds = sections.map((s) => s.id_section)
    const blocks = await listBlocksForSections(sectionIds, idLang, { event })

    const blocksBySection = new Map<number, BlockWithLangRow[]>()
    for (const b of blocks) {
      if (!blocksBySection.has(b.id_section)) blocksBySection.set(b.id_section, [])
      blocksBySection.get(b.id_section)!.push(b)
    }

    const homepage: Record<string, any> = {}
    for (const s of sections) {
      const bs = blocksBySection.get(s.id_section) || []
      const built = buildSectionPayload(s, bs)
      if (built !== undefined) homepage[s.type] = built
    }

    return { homepage, sections: null }
  } catch (err: any) {
    if (err?.code === 'ER_NO_SUCH_TABLE' || err?.errno === 1146) return { homepage: null, sections: null }
    console.error('[homepage-config] DB error:', err?.message)
    throw createError({ statusCode: 500, message: 'Erreur chargement homepage' })
  }
})

/**
 * Mirror reconstruction of `archive/hp_normalize_205.py` — each
 * section-type rebuilds the JSON shape that Nuxt components consume
 * (HomeHero, HomeFeatures, HomePersonas, HomeAbout, HomeBlog, HomeFaq, …).
 */
function buildSectionPayload(s: SectionWithLangRow, blocks: BlockWithLangRow[]): any {
  switch (s.type) {
    case 'hero': {
      const meta = blocks.find((b) => b.block_kind === 'hero-meta' && b.parent_block_id === null)
      const tags = blocks
        .filter((b) => b.block_kind === 'tag' && b.parent_block_id === null)
        .sort((a, b) => a.position - b.position)
        .map((b) => b.label)
        .filter(Boolean)
      const out: Record<string, any> = {}
      if (s.title != null) out.title = s.title
      if (s.subtitle != null) out.subtitle = s.subtitle
      if (meta) {
        const e = extraOf(meta)
        if (e.layout) out.layout = e.layout
        if (meta.image) out.image = meta.image
        if (meta.sticker) out.badge = meta.sticker
        if (meta.text || meta.footer) out.quote = { text: meta.text, author: meta.footer }
        const cta: Record<string, any> = {}
        if (meta.cta_label) cta.label = meta.cta_label
        if (s.cta_href) cta.href = s.cta_href
        if (Object.keys(cta).length) out.cta = cta
        const cta2: Record<string, any> = {}
        if (meta.header) cta2.label = meta.header
        if (meta.href) cta2.href = meta.href
        if (Object.keys(cta2).length) out.cta2 = cta2
      }
      if (tags.length) out.tags = tags
      return out
    }

    case 'features': {
      return blocks
        .filter((b) => b.block_kind === 'feature')
        .sort((a, b) => a.position - b.position)
        .map((b) => ({
          icon: b.icon,
          label: b.label,
          description: b.description,
        }))
    }

    case 'personas': {
      const personas = blocks
        .filter((b) => b.block_kind === 'persona' && b.parent_block_id === null)
        .sort((a, b) => a.position - b.position)
      const items = personas.map((p) => {
        const benefits = blocks
          .filter((b) => b.block_kind === 'benefit' && b.parent_block_id === p.id_block)
          .sort((a, b) => a.position - b.position)
          .map((b) => b.text)
          .filter(Boolean)
        const tags = blocks
          .filter((b) => b.block_kind === 'tag' && b.parent_block_id === p.id_block)
          .sort((a, b) => a.position - b.position)
          .map((b) => b.label)
          .filter(Boolean)
        const e = extraOf(p)
        return {
          emoji: p.icon,
          avatar: p.image,
          name: p.label,
          role: p.subtitle,
          situation: p.description,
          benefits,
          tags,
          color: e.color,
        }
      })
      const out: Record<string, any> = { items }
      if (s.title != null) out.title = s.title
      if (s.subtitle != null) out.subtitle = s.subtitle
      return out
    }

    case 'categories':
      return []

    case 'testimonials':
      return []

    case 'about': {
      const paragraphs = blocks
        .filter((b) => b.block_kind === 'paragraph')
        .sort((a, b) => a.position - b.position)
        .map((b) => b.text)
        .filter(Boolean)
      const map = blocks.find((b) => b.block_kind === 'map')
      const out: Record<string, any> = {}
      if (s.title != null) out.title = s.title
      if (s.subtitle != null) out.subtitle = s.subtitle
      if (paragraphs.length) out.paragraphs = paragraphs
      if (map) {
        const e = extraOf(map)
        if (e.mapEmbed) out.mapEmbed = e.mapEmbed
        const cta: Record<string, any> = {}
        if (map.cta_label) cta.label = map.cta_label
        if (s.cta_href) cta.href = s.cta_href
        if (Object.keys(cta).length) out.cta = cta
      } else if (s.cta_href) {
        out.cta = { href: s.cta_href }
      }
      return out
    }

    case 'blog': {
      const out: Record<string, any> = {}
      if (s.title != null) out.title = s.title
      if (s.limit_items != null) out.limit = Number(s.limit_items)
      return out
    }

    case 'faq': {
      const out: Record<string, any> = {}
      if (s.title != null) out.title = s.title
      if (s.subtitle != null) out.subtitle = s.subtitle
      return out
    }

    case 'malt':
      return { show: s.active === 1 }

    default:
      return undefined
  }
}
