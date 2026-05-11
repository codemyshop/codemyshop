

import {
  getSectionType,
  getActiveLangs,
  updateSectionConfig,
  touchSection,
  upsertSectionLang,
  type ActiveLang,
} from '~/modules/homepage-section/server/utils/homepage-section'
import {
  deleteBlocksForSection,
  insertBlock,
  upsertBlockLang,
  BLOCK_LANG_FIELDS,
  type BlockLangField,
} from '~/modules/homepage-block/server/utils/homepage-block'

function pickLang(v: any, iso: string): string | null {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'string') return v
  if (typeof v === 'object') return v[iso] ?? v.fr ?? null
  return null
}

async function insertBlockMultiLang(
  event: any,
  idSection: number,
  parentId: number | null,
  kind: string,
  position: number,
  masterFields: Record<string, any>,
  langFields: Partial<Record<BlockLangField, any>>,
  langs: ActiveLang[],
): Promise<number> {
  const idBlock = await insertBlock(
    {
      id_section: idSection,
      parent_block_id: parentId,
      block_kind: kind,
      position,
      image: masterFields.image ?? null,
      icon: masterFields.icon ?? null,
      href: masterFields.href ?? null,
      target: masterFields.target ?? null,
      slug: masterFields.slug ?? null,
      extra_config_json: masterFields.extra_config_json ?? null,
    },
    { event },
  )
  for (const l of langs) {
    const row: Partial<Record<BlockLangField, any>> = {}
    for (const f of BLOCK_LANG_FIELDS) {
      row[f] = langFields[f] !== undefined ? pickLang(langFields[f], l.iso_code) : null
    }
    await upsertBlockLang(idBlock, l.id_lang, row, { event })
  }
  return idBlock
}

async function decomposePayload(
  event: any,
  idSection: number,
  type: string,
  payload: any,
  langs: ActiveLang[],
): Promise<void> {
  
  await updateSectionConfig(idSection, {
    limit_items:       payload.limit             !== undefined ? Number(payload.limit)         : null,
    interval_ms:       payload.interval_ms       !== undefined ? Number(payload.interval_ms)   : null,
    cols:              payload.cols              !== undefined ? Number(payload.cols)          : null,
    height_px:         payload.height            !== undefined ? Number(payload.height)        : null,
    cta_href:          payload.cta_to            !== undefined ? payload.cta_to                : null,
    social_handle:     payload.handle            !== undefined ? payload.handle                : null,
    social_url:        payload.url               !== undefined ? payload.url                   : null,
    featured_position: payload.featuredPosition === 'left' || payload.featuredPosition === 'right' ? payload.featuredPosition : null,
  }, { event })

  
  
  
  
  
  const hasReplacementItems =
    (type === 'features'        && Array.isArray(payload.items) && payload.items.length > 0) ||
    (type === 'categories'      && Array.isArray(payload.items) && payload.items.length > 0) ||
    (type === 'banners'         && Array.isArray(payload.items) && payload.items.length > 0) ||
    (type === 'narrative-blocks' && Array.isArray(payload.blocks) && payload.blocks.length > 0) ||
    (type === 'hero-slider'     && (
      (Array.isArray(payload.slides)      && payload.slides.length > 0) ||
      (Array.isArray(payload.side_blocks) && payload.side_blocks.length > 0)
    )) ||
    (type === 'faq'             && Array.isArray(payload.groups) && payload.groups.length > 0) ||
    (type === 'blog'            && payload.cta_label !== undefined && payload.cta_label !== null && payload.cta_label !== '')

  if (!hasReplacementItems) {
    return
  }

  await deleteBlocksForSection(idSection, { event })

  const migrateItems = async (items: any[], kind: string) => {
    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      if (!it || typeof it !== 'object') continue
      const ctaTo = it.cta_to ?? it.to
      const extra = (ctaTo && it.href === undefined && it.cta_href === undefined) ? { cta_to: ctaTo } : null
      await insertBlockMultiLang(event, idSection, null, kind, i, {
        image: it.image,
        icon: it.icon,
        href: it.href ?? it.cta_href,
        target: it.target,
        extra_config_json: extra ? JSON.stringify(extra) : null,
      }, {
        label: it.label, title: it.title, subtitle: it.subtitle,
        sticker: it.sticker, kicker: it.kicker, description: it.description,
        text: it.text, header: it.header, footer: it.footer,
        cta_label: it.cta_label, alt: it.alt,
      }, langs)
    }
  }

  switch (type) {
    case 'hero-slider':
      if (Array.isArray(payload.slides))      await migrateItems(payload.slides, 'slide')
      if (Array.isArray(payload.side_blocks)) await migrateItems(payload.side_blocks, 'side_block')
      break
    case 'features':
      if (Array.isArray(payload.items)) await migrateItems(payload.items, 'feature')
      break
    case 'categories':
      if (Array.isArray(payload.items)) await migrateItems(payload.items, 'category')
      break
    case 'narrative-blocks':
      if (Array.isArray(payload.blocks)) await migrateItems(payload.blocks, 'narrative')
      break
    case 'banners':
      if (Array.isArray(payload.items)) await migrateItems(payload.items, 'banner')
      break
    case 'faq':
      if (Array.isArray(payload.groups)) {
        for (let g = 0; g < payload.groups.length; g++) {
          const group = payload.groups[g]
          if (!group || typeof group !== 'object') continue
          const idGroup = await insertBlockMultiLang(event, idSection, null, 'faq_group', g,
            { slug: group.id },
            { title: group.title }, langs)
          const items = Array.isArray(group.items) ? group.items : []
          for (let i = 0; i < items.length; i++) {
            const it = items[i]
            if (!it || typeof it !== 'object') continue
            await insertBlockMultiLang(event, idSection, idGroup, 'faq_item', i, {},
              { question: it.q, answer_html: it.a }, langs)
          }
        }
      }
      break
    case 'blog':
      if (payload.cta_label !== undefined) {
        await insertBlockMultiLang(event, idSection, null, 'cta', 0,
          { href: payload.cta_to ?? null },
          { cta_label: payload.cta_label }, langs)
      }
      break
    
    
  }
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id || isNaN(Number(id))) {
    throw createError({ statusCode: 400, message: 'id (number) requis' })
  }
  const idSection = Number(id)

  const body = await readBody<{ title?: any; subtitle?: any; payload?: any }>(event)
  if (!body || (body.title === undefined && body.subtitle === undefined && body.payload === undefined)) {
    throw createError({ statusCode: 400, message: 'Au moins un champ (title, subtitle, payload) requis' })
  }

  const langs = await getActiveLangs({ event })
  const sectionType = await getSectionType(idSection, { event })

  if (body.payload !== undefined) {
    if (sectionType && body.payload && typeof body.payload === 'object') {
      await decomposePayload(event, idSection, sectionType, body.payload, langs)
    } else {
      await touchSection(idSection, { event })
    }
  } else {
    await touchSection(idSection, { event })
  }

  if (body.title !== undefined || body.subtitle !== undefined) {
    for (const l of langs) {
      const title    = body.title    !== undefined ? pickLang(body.title,    l.iso_code) : undefined
      const subtitle = body.subtitle !== undefined ? pickLang(body.subtitle, l.iso_code) : undefined
      await upsertSectionLang(idSection, l.id_lang, title, subtitle, { event })
    }
  }

  return { ok: true, id: idSection }
})
