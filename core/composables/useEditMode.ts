/**
 *
 * Edit/Preview mode — enabled by BuilderToolbar or ?edit_mode=1.
 * Persists in localStorage to survive page refresh.
 */

export const useEditMode = () => {
  const route = useRoute()
  const auth = useAuth()
  const user = (auth as any).user as Ref<{ is_admin?: boolean; user_type?: string } | null> | undefined
  const editState = useState('edit_mode', () => false)

  // Toute l'équipe (admins ROOT/FOUNDER + employés tous rôles confondus) peut
  // activer le builder. Restreindre à is_admin cachait les boutons aux EMPLOYEE
  // qui doivent pouvoir éditer le contenu de leur site (cf. incidents
  // 2026-04-25 : employé Example Shop bloqué sur /grossiste/fruit-sec/).
  const canEdit = computed(() => {
    const u = user?.value
    if (!u) return false
    return !!u.is_admin || u.user_type === 'employee'
  })

  const isEditMode = computed(() => {
    // Iframe builder preview : toujours OFF (preview propre, sans edit badges)
    if (route.query['builder-preview'] === '1') return false
    if (!canEdit.value) return false
    if (route.query.edit_mode === '1') return true
    return editState.value
  })

  const editKey = `${useRuntimeConfig().public.clientId || 'app'}_edit_mode`

  function toggleEditMode() {
    editState.value = !editState.value
    if (import.meta.client) {
      localStorage.setItem(editKey, String(editState.value))
    }
  }

  function init() {
    if (!import.meta.client) return
    const stored = localStorage.getItem(editKey)
    if (stored === 'true') editState.value = true
  }

  return { isEditMode, canEdit, toggleEditMode, init }
}
