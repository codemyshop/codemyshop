/**
 *
 * Composable for footer config from /api/footer-config (DB-first cs_footer_config).
 */

export interface FooterDbData {
  theme?: string
  description?: any
  hours?: any
  logo?: { src?: string; href?: string; alt?: any } | null
  contact?: { email?: string; phone?: string; address?: string; cta?: any }
  social?: Array<{ platform: string; href: string; label?: any }>
  bottomBar?: { copyright?: any }
  newsletter?: {
    show?: boolean
    title?: any
    description?: any
    placeholder?: any
    ctaLabel?: any
    consentText?: any
  }
}

export function useFooterDb() {
  const { activeLang } = useRouteLang()
  const { data, status } = useFetch<{ footer: FooterDbData | null }>('/api/footer-config', {
    key: 'footer-db',
    query: { lang: activeLang },
    watch: [activeLang],
    default: () => ({ footer: null }),
  })

  const builderFooter = useState<FooterDbData | null>('footer_builder_override', () => null)

  const footer = computed<FooterDbData>(() => {
    if (builderFooter.value) return builderFooter.value
    if (data.value?.footer) return data.value.footer
    return { theme: 'dark' }
  })

  function loadIntoBuilder() {
    builderFooter.value = JSON.parse(JSON.stringify(data.value?.footer || { theme: 'dark' }))
  }

  function updateFooterField(patch: Partial<FooterDbData>) {
    if (!builderFooter.value) loadIntoBuilder()
    builderFooter.value = { ...builderFooter.value!, ...patch }
  }

  function updateContact(patch: Partial<NonNullable<FooterDbData['contact']>>) {
    if (!builderFooter.value) loadIntoBuilder()
    builderFooter.value = {
      ...builderFooter.value!,
      contact: { ...builderFooter.value!.contact, ...patch },
    }
  }

  function updateBottomBar(patch: Partial<NonNullable<FooterDbData['bottomBar']>>) {
    if (!builderFooter.value) loadIntoBuilder()
    builderFooter.value = {
      ...builderFooter.value!,
      bottomBar: { ...builderFooter.value!.bottomBar, ...patch },
    }
  }

  function updateNewsletter(patch: Partial<NonNullable<FooterDbData['newsletter']>>) {
    if (!builderFooter.value) loadIntoBuilder()
    builderFooter.value = {
      ...builderFooter.value!,
      newsletter: { ...builderFooter.value!.newsletter, ...patch },
    }
  }

  function setSocial(social: FooterDbData['social']) {
    if (!builderFooter.value) loadIntoBuilder()
    builderFooter.value = { ...builderFooter.value!, social }
  }

  async function syncToDb() {
    if (!builderFooter.value) return
    await $fetch('/api/footer-config/sync', {
      method: 'PUT',
      body: { footer: builderFooter.value },
    })
    await refreshNuxtData('footer-db')
  }

  return {
    footer,
    status,
    builderFooter,
    loadIntoBuilder,
    updateFooterField,
    updateContact,
    updateBottomBar,
    updateNewsletter,
    setSocial,
    syncToDb,
  }
}
