/**
 *
 * PUT /api/footer-config/sync — UPSERT footer config (master + _lang + social).
 * Accepts i18n values as plain strings (applied to all active languages
 * ) OR as an object { fr, en, … } (one value per iso_code, fallback fr).
 */
import { resolveClientId } from '~/server/utils/db'
import {
  upsertConfig,
  getConfigIdByClient,
  upsertConfigLang,
  replaceSocials,
  getActiveLangs,
} from '~/modules/footer/server/utils/footer'

function pickLang(v: any, iso: string): string | null {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'string') return v
  if (typeof v === 'object') return v[iso] ?? v.fr ?? null
  return null
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{ footer: any }>(event)
  if (!body?.footer) throw createError({ statusCode: 400, message: 'footer requis' })

  const f = body.footer
  const clientId = resolveClientId(event)
  const langs = await getActiveLangs({ event })

  // 1. Master config
  await upsertConfig({
    clientId,
    footerTheme: f.theme || 'dark',
    logoSrc: f.logo?.src || null,
    logoHref: f.logo?.href || null,
    contactEmail: f.contact?.email || null,
    contactPhone: f.contact?.phone || null,
    contactAddress: f.contact?.address || null,
    contactCtaHref: f.contact?.cta?.href || null,
    newsletterEnabled: f.newsletter?.show ? 1 : 0,
  }, { event })

  const idCfg = await getConfigIdByClient(clientId, { event })
  if (!idCfg) throw createError({ statusCode: 500, message: 'Impossible de résoudre id_footer_config' })

  // 2. _lang (une ligne par langue active)
  for (const l of langs) {
    await upsertConfigLang(idCfg, l.id_lang, {
      description: pickLang(f.description, l.iso_code),
      hours: pickLang(f.hours, l.iso_code),
      logoAlt: pickLang(f.logo?.alt, l.iso_code),
      contactCtaLabel: pickLang(f.contact?.cta?.label, l.iso_code),
      bottombarCopyright: pickLang(f.bottomBar?.copyright, l.iso_code),
      newsletterTitle:       pickLang(f.newsletter?.title,       l.iso_code),
      newsletterDescription: pickLang(f.newsletter?.description, l.iso_code),
      newsletterPlaceholder: pickLang(f.newsletter?.placeholder, l.iso_code),
      newsletterCtaLabel:    pickLang(f.newsletter?.ctaLabel,    l.iso_code),
      newsletterConsentText: pickLang(f.newsletter?.consentText, l.iso_code),
    }, { event })
  }

  // 3. Social — DELETE ALL + INSERT (replace strategy)
  const socialItems = Array.isArray(f.social) ? f.social : []
  const socials = []
  let pos = 0
  for (const s of socialItems) {
    const platform = String(s.platform || '').trim()
    const href = String(s.href || '').trim()
    if (!platform || !href) continue
    socials.push({
      platform,
      href,
      position: pos++,
      labelByLang: langs.map((l) => ({
        idLang: l.id_lang,
        label: pickLang(s.label, l.iso_code) || platform,
      })),
    })
  }
  await replaceSocials(idCfg, socials, { event })

  return { ok: true }
})
