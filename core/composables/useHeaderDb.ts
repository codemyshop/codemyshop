

export interface HeaderDbData {
  logo: {
    src?: string | null
    alt?: Record<string, string> | null
    text?: Record<string, string> | null
    href?: string
    class?: string
  }
  topBar: {
    message?: Record<string, string> | null
    showLanguages?: boolean
    align?: 'left' | 'center'
    languages?: Array<{ code: string; label: Record<string, string>; href: string }>
  }
  contactEmail?: string | null
  features: {
    showSearch?: boolean
    showWishlist?: boolean
    showLogin?: boolean
    showContact?: boolean
    showCart?: boolean
    showBlogLink?: boolean
    showContactLink?: boolean
    showGiftcardLink?: boolean
    stickyHeader?: boolean
    headerLayout?: string
  }
  
  navBar?: {
    backgroundColor?: string | null
    textColor?: string | null
  } | null
}

const DEFAULT_HEADER: HeaderDbData = {
  logo: { href: '/' },
  topBar: {},
  features: {},
}

export function useHeaderDb() {
  const { activeLang } = useRouteLang()
  const { data, status } = useFetch<{ header: HeaderDbData | null }>('/api/header-config', {
    key: 'header-db',
    query: { lang: activeLang },
    watch: [activeLang],
    default: () => ({ header: null }),
  })

  const builderHeader = useState<HeaderDbData | null>('header_builder_override', () => null)

  const header = computed<HeaderDbData>(() => {
    if (builderHeader.value) return builderHeader.value
    if (data.value?.header) return data.value.header
    return DEFAULT_HEADER
  })

  function loadIntoBuilder() {
    
    
    if (data.value?.header) {
      builderHeader.value = JSON.parse(JSON.stringify(data.value.header))
    }
  }

  function updateLogo(patch: Partial<HeaderDbData['logo']>) {
    if (!builderHeader.value) loadIntoBuilder()
    builderHeader.value = {
      ...builderHeader.value!,
      logo: { ...builderHeader.value!.logo, ...patch },
    }
  }

  function updateTopBar(patch: Partial<HeaderDbData['topBar']>) {
    if (!builderHeader.value) loadIntoBuilder()
    builderHeader.value = {
      ...builderHeader.value!,
      topBar: { ...builderHeader.value!.topBar, ...patch },
    }
  }

  function updateFeatures(patch: Partial<HeaderDbData['features']>) {
    if (!builderHeader.value) loadIntoBuilder()
    builderHeader.value = {
      ...builderHeader.value!,
      features: { ...builderHeader.value!.features, ...patch },
    }
  }

  function updateContactEmail(email: string) {
    if (!builderHeader.value) loadIntoBuilder()
    builderHeader.value = { ...builderHeader.value!, contactEmail: email }
  }

  async function syncToDb() {
    if (!builderHeader.value) return
    await $fetch('/api/header-config/sync', {
      method: 'PUT',
      body: { header: builderHeader.value },
    })
    await refreshNuxtData('header-db')
  }

  function clearBuilderOverride() {
    builderHeader.value = null
  }

  return {
    header,
    status,
    builderHeader,
    loadIntoBuilder,
    updateLogo,
    updateTopBar,
    updateFeatures,
    updateContactEmail,
    syncToDb,
    clearBuilderOverride,
  }
}
