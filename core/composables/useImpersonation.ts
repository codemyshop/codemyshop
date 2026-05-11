

export function useImpersonation() {
  const { customer } = useCustomerAuth()

  const isImpersonating = computed(() => !!customer.value?.isImpersonated)
  const sessionId = computed(() => customer.value?.impersonationSessionId ?? null)
  const employeeId = computed(() => customer.value?.impersonatorEmployeeId ?? null)
  const targetCustomerId = computed(() => isImpersonating.value ? customer.value?.customerId ?? null : null)
  const customerLabel = computed(() => {
    if (!customer.value) return ''
    const full = [customer.value.firstname, customer.value.lastname].filter(Boolean).join(' ').trim()
    return full || customer.value.email || `client #${customer.value.customerId}`
  })

  return {
    isImpersonating,
    sessionId,
    employeeId,
    targetCustomerId,
    customerLabel,
  }
}
