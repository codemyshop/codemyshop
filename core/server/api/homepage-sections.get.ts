

import { ensureTrailingSlash, isCategoryHref } from '~/server/utils/category-url'
import { listSectionsWithLang } from '~/modules/homepage-section/server/utils/homepage-section'
import { listBlocksForSections, type BlockWithLangRow } from '~/modules/homepage-block/server/utils/homepage-block'

interface HomepageSection {
  id: number
  position: number
  type: string
  title: string | null
  subtitle: string | null
  payload: any
  active: boolean
}

export default defineEventHandler(async (event): Promise<{ sections: HomepageSection[] }> => {
  const query = getQuery(event)
  const includeAll = query.all === '1' || query.all === 'true'
  const { resolveIdLang } = await import('~/server/utils/lang')
  const idLang = await resolveIdLang(event)

  try {
    const rows = await listSectionsWithLang(idLang, includeAll, { event })
    if (!rows.length) return { sections: [] }

    const sectionIds = rows.map((r) => r.id_section)
    const blocks = await listBlocksForSections(sectionIds, idLang, { event })

    const blocksBySection = new Map<number, BlockWithLangRow[]>()
    for (const b of blocks) {
      if (!blocksBySection.has(b.id_section)) blocksBySection.set(b.id_section, [])
      blocksBySection.get(b.id_section)!.push(b)
    }

    const sections: HomepageSection[] = rows.map((r) => ({
      id: r.id_section,
      position: r.position,
      type: r.type,
      title: r.title,
      subtitle: r.subtitle,
      payload: buildPayload(r.type, rowToBase(r), blocksBySection.get(r.id_section) || []),
      active: r.active === 1,
    }))

    return { sections }
  } catch (err: any) {
    if (err?.code === 'ER_NO_SUCH_TABLE' || err?.errno === 1146) {
      console.warn('[homepage-sections] Table absente, fallback statique')
      return { sections: [] }
    }
    console.error('[homepage-sections] Erreur DB :', err?.message)
    return { sections: [] }
  }
})

function rowToBase(r: any): Record<string, any> {
  const base: Record<string, any> = {}
  if (r.limit_items   != null) base.limit       = Number(r.limit_items)
  if (r.interval_ms   != null) base.interval_ms = Number(r.interval_ms)
  if (r.cols          != null) base.cols        = Number(r.cols)
  if (r.height_px     != null) base.height      = Number(r.height_px)
  if (r.cta_href)              base.cta_to      = r.cta_href
  if (r.social_handle)         base.handle      = r.social_handle
  if (r.social_url)            base.url         = r.social_url
  if (r.featured_position === 'left' || r.featured_position === 'right') {
    base.featuredPosition = r.featured_position
  }
  return base
}

function buildPayload(type: string, base: any, blocks: BlockWithLangRow[]): any {
  const out: any = { ...(base || {}) }
  const extraOf = (b: BlockWithLangRow) => { try { return b.extra_config_json ? JSON.parse(b.extra_config_json) : {} } catch { return {} } }

  switch (type) {
    case 'hero': {
      
      
      
      
      const img = blocks.find((b) => b.block_kind === 'hero_image')
      if (img?.image) out.image = img.image
      if (img?.href)  out.imageHref = img.href
      return out
    }
    case 'iframe-embed': {
      
      
      
      const iframe = blocks.find((b) => b.block_kind === 'iframe')
      if (iframe) {
        out.src = iframe.href || null
        const extra = extraOf(iframe)
        out.title = extra.title || null
      }
      return out
    }
    case 'hero-slider': {
      const normLink = (v: string | null | undefined) => (isCategoryHref(v) ? ensureTrailingSlash(v) : v ?? null)
      const slides = blocks.filter((b) => b.block_kind === 'slide').map((b) => {
        const e = extraOf(b)
        return {
          image: b.image,
          sticker: b.sticker,
          title: b.title,
          subtitle: b.subtitle,
          cta_label: b.cta_label,
          cta_to: normLink(b.href || e.cta_to),
        }
      })
      const sideBlocks = blocks.filter((b) => b.block_kind === 'side_block').map((b) => {
        const e = extraOf(b)
        return {
          image: b.image,
          alt: b.alt,
          to: normLink(b.href || e.cta_to),
          sticker: b.sticker,
          title: b.title,
          cta_label: b.cta_label,
        }
      })
      if (slides.length) out.slides = slides
      if (sideBlocks.length) out.side_blocks = sideBlocks
      return out
    }
    case 'features':
      out.items = blocks.filter((b) => b.block_kind === 'feature').map((b) => ({
        image: b.image,
        label: b.label,
        description: b.description,
        title: b.title,
        text: b.text,
      }))
      return out
    case 'categories':
      
      
      
      
      
      out.items = blocks.filter((b) => b.block_kind === 'category').map((b) => ({
        ...(b.image ? { image: b.image } : b.icon ? { icon: b.icon } : {}),
        label: b.label,
        href: isCategoryHref(b.href) ? ensureTrailingSlash(b.href) : b.href,
      }))
      return out
    case 'brand-strip':
      
      
      
      out.items = blocks.filter((b) => b.block_kind === 'brand').map((b) => ({
        label: b.label,
        href: b.href,
        image: b.image || null,
      }))
      return out
    case 'narrative-blocks':
      out.blocks = blocks.filter((b) => b.block_kind === 'narrative').map((b) => {
        const e = extraOf(b)
        return {
          image: b.image,
          kicker: b.kicker,
          title: b.title,
          text: b.text,
          cta_label: b.cta_label,
          cta_to: b.href || e.cta_to || null,
        }
      })
      return out
    case 'banners':
      out.items = blocks.filter((b) => b.block_kind === 'banner').map((b) => ({
        image: b.image,
        header: b.header,
        title: b.title,
        footer: b.footer,
        cta_label: b.cta_label,
        cta_href: b.href,
        target: b.target,
      }))
      return out
    case 'faq': {
      const groups = blocks.filter((b) => b.block_kind === 'faq_group')
      out.groups = groups.map((g) => ({
        id: g.slug || String(g.id_block),
        title: g.title,
        items: blocks
          .filter((b) => b.block_kind === 'faq_item' && b.parent_block_id === g.id_block)
          .map((i) => ({ q: i.question, a: i.answer_html })),
      }))
      return out
    }
    case 'blog': {
      const cta = blocks.find((b) => b.block_kind === 'cta')
      if (cta) out.cta_label = cta.cta_label
      return out
    }
    default:
      
      return base || null
  }
}
