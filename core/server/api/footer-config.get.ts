/**
 *
 * GET /api/footer-config
 * Footer config for the tenant from cs_footer_config JOIN _lang + cs_footer_social.
 * Strict _lang pattern, no more JSON i18n.
 */
import { resolveClientId } from '~/server/utils/db'
import { getConfigWithLang, listSocialsWithLang } from '~/modules/footer/server/utils/footer'

export default defineEventHandler(async (event) => {
  const { resolveIdLang } = await import('~/server/utils/lang')
  const idLang = await resolveIdLang(event)
  const clientId = resolveClientId(event)

  try {
    const row = await getConfigWithLang(clientId, idLang, { event })
    if (!row) return { footer: null }

    const social = await listSocialsWithLang(row.id_footer_config, idLang, { event })

    return {
      footer: {
        theme: row.footer_theme,
        description: row.description || null,
        hours: row.hours || null,
        logo: row.logo_src ? { src: row.logo_src, href: row.logo_href, alt: row.logo_alt || null } : undefined,
        contact: {
          email: row.contact_email,
          phone: row.contact_phone,
          address: row.contact_address,
          cta: (row.contact_cta_href || row.contact_cta_label)
            ? { href: row.contact_cta_href || null, label: row.contact_cta_label || null }
            : null,
        },
        social: social.map((s) => ({ platform: s.platform, href: s.href, label: s.label })),
        bottomBar: { copyright: row.bottombar_copyright || null },
        newsletter: {
          show:        row.newsletter_enabled === 1,
          title:       row.newsletter_title || null,
          description: row.newsletter_description || null,
          placeholder: row.newsletter_placeholder || null,
          ctaLabel:    row.newsletter_cta_label || null,
          consentText: row.newsletter_consent_text || null,
        },
      },
    }
  } catch (err: any) {
    if (err?.code === 'ER_NO_SUCH_TABLE' || err?.errno === 1146) return { footer: null }
    console.error('[footer-config] DB error:', err?.message)
    throw createError({ statusCode: 500, message: 'Erreur chargement footer' })
  }
})
