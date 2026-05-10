/**
 *
 * Composable for homepage config from /api/homepage-config (DB-first
 * cs_homepage_section + cs_homepage_block, master cs_homepage dropped #200).
 */

export interface HomepageDbData {
  hero?: any
  features?: any[]
  personas?: any[]
  categories?: any[]
  testimonials?: any[]
  about?: any
  blog?: any
  faq?: any
  malt?: any
}

export function useHomepageDb() {
  const { activeLang } = useRouteLang()
  const { data, status } = useFetch<{ homepage: HomepageDbData | null; sections: any[] | null }>('/api/homepage-config', {
    key: 'homepage-db',
    query: { lang: activeLang },
    watch: [activeLang],
    default: () => ({ homepage: null, sections: null }),
  })

  const builderHomepage = useState<HomepageDbData | null>('homepage_builder_override', () => null)
  const builderSections = useState<any[] | null>('homepage_sections_override', () => null)

  const homepage = computed<HomepageDbData>(() => {
    if (builderHomepage.value) return builderHomepage.value
    if (data.value?.homepage) return data.value.homepage
    return {}
  })

  const sections = computed<any[]>(() => {
    if (builderSections.value) return builderSections.value
    if (data.value?.sections) return data.value.sections
    return []
  })

  function loadIntoBuilder() {
    builderHomepage.value = JSON.parse(JSON.stringify(data.value?.homepage || {}))
    builderSections.value = JSON.parse(JSON.stringify(data.value?.sections || []))
  }

  function updateSection(key: string, value: any) {
    if (!builderHomepage.value) loadIntoBuilder()
    builderHomepage.value = { ...builderHomepage.value!, [key]: value }
  }

  function updateHero(patch: Record<string, any>) {
    if (!builderHomepage.value) loadIntoBuilder()
    builderHomepage.value = {
      ...builderHomepage.value!,
      hero: { ...builderHomepage.value!.hero, ...patch },
    }
  }

  function updateAbout(patch: Record<string, any>) {
    if (!builderHomepage.value) loadIntoBuilder()
    builderHomepage.value = {
      ...builderHomepage.value!,
      about: { ...builderHomepage.value!.about, ...patch },
    }
  }

  function updateBlog(patch: Record<string, any>) {
    if (!builderHomepage.value) loadIntoBuilder()
    builderHomepage.value = {
      ...builderHomepage.value!,
      blog: { ...builderHomepage.value!.blog, ...patch },
    }
  }

  function updateFaq(patch: Record<string, any>) {
    if (!builderHomepage.value) loadIntoBuilder()
    builderHomepage.value = {
      ...builderHomepage.value!,
      faq: { ...builderHomepage.value!.faq, ...patch },
    }
  }

  function setFeatures(features: any[]) {
    if (!builderHomepage.value) loadIntoBuilder()
    builderHomepage.value = { ...builderHomepage.value!, features }
  }

  function setCategories(categories: any[]) {
    if (!builderHomepage.value) loadIntoBuilder()
    builderHomepage.value = { ...builderHomepage.value!, categories }
  }

  function setTestimonials(testimonials: any[]) {
    if (!builderHomepage.value) loadIntoBuilder()
    builderHomepage.value = { ...builderHomepage.value!, testimonials }
  }

  function setSections(s: any[]) {
    builderSections.value = [...s]
  }

  async function syncToDb() {
    if (!builderHomepage.value) return
    await $fetch('/api/homepage-config/sync', {
      method: 'PUT',
      body: { homepage: builderHomepage.value, sections: builderSections.value },
    })
    await refreshNuxtData('homepage-db')
  }

  return {
    homepage,
    sections,
    builderHomepage,
    builderSections,
    loadIntoBuilder,
    updateSection,
    updateHero,
    updateAbout,
    updateBlog,
    updateFaq,
    setFeatures,
    setCategories,
    setTestimonials,
    setSections,
    syncToDb,
  }
}
