

export function useB2bVisibility() {
  const { public: publicCfg } = useRuntimeConfig()
  const customerAuth = useCustomerAuth()
  const psFlags = useState<Record<string, string>>('ps_flags', () => ({}))

  const isB2b = computed(() => {
    const dbFlag = psFlags.value?.PS_B2B_ENABLE
    if (dbFlag === '1') return true
    if (dbFlag === '0') return false
    
    return publicCfg.b2bMode === true
  })

  const isCatalogMode = computed(() => psFlags.value?.PS_CATALOG_MODE === '1')

  
  const showPrices = computed(() => !isB2b.value || customerAuth.loggedIn.value)

  return { showPrices, isB2b, isCatalogMode, loggedIn: customerAuth.loggedIn }
}
