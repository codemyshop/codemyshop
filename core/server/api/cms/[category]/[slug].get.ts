/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /api/cms/:category/:slug
 * Individual blog article from the DB (direct read from ps_cms + ps_cms_lang).
 * Lookup par link_rewrite = "{category}--{slug}".
 */
import { stripHtml, decodeHtmlEntities } from '~/server/utils/ps'
import { useClientDb } from '~/server/utils/db'
import { resolveIdLang } from '~/server/utils/lang'
import { listFaqsByParent } from '~/modules/faq/server/utils/faq'
import { getAuthorByCmsId } from '~/internal/employeeextra/server/utils/employeeextra'

export default defineEventHandler(async (event) => {
  const category = getRouterParam(event, 'category') ?? ''
  const slug     = getRouterParam(event, 'slug') ?? ''
  const linkRewrite = category ? `${category}--${slug}` : slug

  try {
    const db = useClientDb(event)
    const idLang = await resolveIdLang(event)

    // Check if cs_cms_extra exists and which columns it has
    // (Hub AC has audio_enabled/audio_url, Example Shop v2 does not — schema drift)
    let extraCols: string[] = []
    try {
      const cols = await db.query('SHOW COLUMNS FROM cs_cms_extra')
      extraCols = cols.map((c: any) => c.Field as string)
    } catch { /* table doesn't exist */ }

    const hasExtra = extraCols.includes('date_published')
    const hasAudio = extraCols.includes('audio_enabled')

    const extraSelect = hasExtra
      ? `COALESCE(ex.date_published, '') as date_published, COALESCE(ex.date_updated, '') as date_updated,`
      : `'' as date_published, '' as date_updated,`
    const audioSelect = hasAudio
      ? `COALESCE(ex.audio_enabled, 0) as audio_enabled, COALESCE(ex.audio_url, '') as audio_url`
      : `0 as audio_enabled, '' as audio_url`
    const joinClause = hasExtra
      ? `LEFT JOIN cs_cms_extra ex ON ex.id_cms = c.id_cms`
      : ''

    const sql = `SELECT c.id_cms, cl.meta_title, cl.meta_description, cl.content, cl.link_rewrite,
               ${extraSelect}
               ${audioSelect}
         FROM ps_cms c
         JOIN ps_cms_lang cl ON c.id_cms = cl.id_cms AND cl.id_lang = ?
         ${joinClause}
         WHERE c.active = 1 AND cl.link_rewrite = ?`

    const rows = await db.query(sql, [idLang, linkRewrite])

    const item = rows[0]
    if (!item) {
      throw createError({ statusCode: 404, message: 'Article introuvable' })
    }

    const rawContent = item.content || ''

    // Cover image — 1) from HTML content, 2) from cs_covergen_queue
    const coverMatch = rawContent.match(/<img[^>]+src=["']([^"']+)["']/)
    let coverImage = coverMatch ? coverMatch[1] : ''

    if (!coverImage) {
      try {
        const coverRow = await db.query(
          `SELECT cover_url FROM cs_covergen_queue WHERE id_cms = ? AND status = 'done' ORDER BY id_covergen DESC LIMIT 1`,
          [item.id_cms],
        )
        if (coverRow[0]?.cover_url) coverImage = coverRow[0].cover_url
      } catch { /* table doesn't exist */ }
    }

    // Remove cover from body
    const bodyContent = (() => {
      if (!coverImage) return rawContent
      const esc = coverImage.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      return rawContent
        .replace(/<figure[^>]*>[\s\S]*?<\/figure>\s*/gi, (m: string) => m.includes(coverImage) ? '' : m)
        .replace(new RegExp(`<img[^>]+src=["']${esc}["'][^>]*/?>\\s*`, 'gi'), '')
    })()

    // FAQ — priority: DB (cs_faq parent_type='cms') > HTML inline
    // Safety guard: single FAQ source, never two.
    const faq: { q: string; a: string }[] = []
    let contentClean = bodyContent

    // 1. Absolute priority: FAQ DB via ac_faq facade (parent_type='cms')
    try {
      const items = await listFaqsByParent('cms', Number(item.id_cms), idLang, { event })
      for (const it of items) {
        if (it.question) faq.push({ q: it.question, a: it.answer })
      }
    } catch { /* table doesn't exist on this tenant */ }

    // 2. Fallback HTML inline (formats A, B, C)
    if (!faq.length) {
      // Format A — <dl>/<dt>/<dd>
      const faqMatchA = bodyContent.match(/<h2[^>]*>\s*Questions\s+fr[eé\u00e9](?:&eacute;)?quentes\s*<\/h2>\s*<dl>([\s\S]*?)<\/dl>/i)
      if (faqMatchA) {
        contentClean = bodyContent.replace(faqMatchA[0], '').trim()
        for (const m of faqMatchA[1].matchAll(/<dt>([\s\S]*?)<\/dt>\s*<dd>([\s\S]*?)<\/dd>/gi)) {
          faq.push({ q: decodeHtmlEntities(stripHtml(m[1]).trim()), a: decodeHtmlEntities(stripHtml(m[2]).trim()) })
        }
      }

      // Format B — <div class="faq-section">
      if (!faq.length) {
        const faqMatchB = bodyContent.match(/<div[^>]*class="[^"]*faq-section[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*$/i)
          ?? bodyContent.match(/<div[^>]*class="[^"]*faq-section[^"]*"[^>]*>([\s\S]*?)$/i)
        if (faqMatchB) {
          contentClean = bodyContent.replace(faqMatchB[0], '').trim()
          for (const m of faqMatchB[1].matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>\s*<div[^>]*>([\s\S]*?)<\/div>/gi)) {
            faq.push({ q: decodeHtmlEntities(stripHtml(m[1]).trim()), a: decodeHtmlEntities(stripHtml(m[2]).trim()) })
          }
        }
      }

      // Format C — H2 "FAQ" + H3 questions + paragraphs (AI-generated content)
      if (!faq.length) {
        const faqMatchC = bodyContent.match(/<h2[^>]*>\s*FAQ[^<]*<\/h2>([\s\S]*)$/i)
        if (faqMatchC) {
          contentClean = bodyContent.replace(faqMatchC[0], '').trim()
          for (const m of faqMatchC[1].matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>\s*<p[^>]*>([\s\S]*?)<\/p>/gi)) {
            faq.push({ q: decodeHtmlEntities(stripHtml(m[1]).trim()), a: m[2].trim() })
          }
        }
      }
    }

    // 4. If FAQ DB found, clean up the inline FAQ section from HTML (avoid duplicate)
    if (faq.length && contentClean === bodyContent) {
      // Remove any H2 section containing "FAQ" or "Frequently asked questions" until the end or the next H2
      contentClean = bodyContent
        .replace(/<h2[^>]*>\s*FAQ[^<]*<\/h2>[\s\S]*$/i, '')
        .replace(/<h2[^>]*>\s*Questions\s+fr[eé\u00e9](?:&eacute;)?quentes[^<]*<\/h2>[\s\S]*$/i, '')
        .trim()
    }

    const wordCount = stripHtml(contentClean).split(/\s+/).filter(Boolean).length
    const readingTime = Math.max(1, Math.round(wordCount / 200))
    const thumbnailImage = coverImage ? coverImage.replace(/\/cover-/, '/thumb-') : ''

    // Subcategory from slug
    const slugParts = slug.split('--')
    const subcategory = slugParts.length >= 2 ? slugParts[0] : ''

    // Mentor Academy
    let mentor: any = null
    try {
      const mentorKey = resolveMentor(category, subcategory)
      if (mentorKey) {
        const { getAllModulesAsync } = await import('~/server/utils/academy-content')
        const academy = await getAllModulesAsync()
        const articleUrl = `/blog/${category}/${slug}`
        const relatedMod = academy.modules?.find((mod: any) =>
          mod.relatedArticles?.some((entry: any) => {
            const url = typeof entry === 'string' ? entry : entry?.url || ''
            return url.includes(linkRewrite) || url === articleUrl
          })
        )
        const fallbackMod = academy.modules?.find((mod: any) => mod.mentor === mentorKey)
        const mod = relatedMod ?? fallbackMod
        const effectiveMentorKey = relatedMod ? relatedMod.mentor : mentorKey

        if (mod) {
          const { findMentorQuoteByModule } = await import('~/internal/academy/server/utils/academy')
          const q = await findMentorQuoteByModule(mod.slug, effectiveMentorKey, { event }).catch(() => null)

          if (q) {
            mentor = {
              key: effectiveMentorKey,
              name: effectiveMentorKey,
              title: '',
              quote: q.quote,
              quoteSource: q.source || '',
              domain: '',
              academySlug: mod.slug,
            }
          }
        }
      }
    } catch { /* mentor resolution not critical */ }

    const author = await getAuthorByCmsId(Number(item.id_cms), { event }).catch(() => null)

    return {
      id: item.id_cms,
      title: item.meta_title || '',
      category,
      subcategory,
      slug,
      coverImage,
      thumbnailImage,
      content: contentClean,
      faq,
      metaDescription: item.meta_description || '',
      active: true,
      datePublished: item.date_published || '',
      dateUpdated: item.date_updated || '',
      readingTime,
      mentor,
      audioEnabled: !!Number(item.audio_enabled),
      audioUrl: item.audio_url || '',
      author: author ? {
        id: Number(author.id),
        slug: author.slug,
        name: author.displayName,
        firstname: author.firstname,
        lastname: author.lastname,
        title: author.expertise || '',
        bio: author.bio || '',
        image: author.photoUrl || '',
        linkedinUrl: author.linkedinUrl || '',
        url: author.slug ? `/auteur/${author.slug}` : '',
      } : null,
    }
  } catch (err: any) {
    if (err.statusCode === 404) throw err
    console.error('[API cms/slug] DB error:', err.message)
    throw createError({ statusCode: 500, message: 'Erreur serveur' })
  }
})

/** Category/subcategory mapping → mentor system */
const CATEGORY_MENTOR: Record<string, string> = {
  'prestashop/architecture': 'descartes',
  'prestashop/developpement': 'descartes',
  'prestashop/performance': 'aristote',
  'prestashop': 'descartes',
  'strategie/flywheel': 'machiavel',
  'strategie/positionnement': 'sun-tzu',
  'strategie': 'machiavel',
  'strategie/intelligence-artificielle': 'socrate',
  'seo/intelligence-artificielle': 'vinci',
  'seo': 'aristote',
  'devops/docker': 'kant',
  'devops': 'kant',
}

function resolveMentor(cat: string, subcat: string): string | null {
  return CATEGORY_MENTOR[`${cat}/${subcat}`] ?? CATEGORY_MENTOR[cat] ?? null
}
