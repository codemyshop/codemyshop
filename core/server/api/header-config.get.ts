/**
 *
 * GET /api/header-config
 * Config header depuis cs_header JOIN cs_header_lang + cs_header_locale.
 * Strict _lang pattern, no more JSON i18n.
 */
import { resolveClientId } from '~/server/utils/db'
import { getHeaderWithLang, getHeaderLocales } from '~/modules/header/server/utils/header'

export default defineEventHandler(async (event) => {
  const { resolveIdLang } = await import('~/server/utils/lang')
  const idLang = await resolveIdLang(event)
  const clientId = resolveClientId(event)

  try {
    const row = await getHeaderWithLang(clientId, idLang, { event })
    if (!row) return { header: null }

    const languages = await getHeaderLocales(row.id_header, idLang, { event })

    return {
      header: {
        logo: {
          src: row.logo_src,
          alt: row.logo_alt || null,
          text: row.logo_text || null,
          href: row.logo_href,
          class: row.logo_class,
        },
        topBar: {
          message: row.topbar_message || null,
          showLanguages: Boolean(row.topbar_show_languages),
          align: (row.topbar_align === 'center' ? 'center' : 'left') as 'left' | 'center',
          languages,
        },
        contactEmail: row.contact_email,
        features: {
          showSearch: Boolean(row.feat_show_search),
          showWishlist: Boolean(row.feat_show_wishlist),
          showLogin: Boolean(row.feat_show_login),
          showContact: Boolean(row.feat_show_contact),
          showCart: Boolean(row.feat_show_cart),
          showBlogLink: Boolean(row.feat_show_blog_link),
          showContactLink: Boolean(row.feat_show_contact_link),
          showGiftcardLink: Boolean(row.feat_show_giftcard_link),
          showStoresLink: Boolean(row.feat_show_stores_link),
          stickyHeader: Boolean(row.feat_sticky_header),
          headerLayout: row.feat_header_layout || 'stacked',
        },
        navBar: (row.nav_bg_color || row.nav_text_color) ? {
          backgroundColor: row.nav_bg_color || null,
          textColor: row.nav_text_color || null,
        } : null,
      },
    }
  } catch (err: any) {
    if (err?.code === 'ER_NO_SUCH_TABLE' || err?.errno === 1146) return { header: null }
    console.error('[header-config] DB error:', err?.message)
    throw createError({ statusCode: 500, message: 'Erreur chargement header' })
  }
})
