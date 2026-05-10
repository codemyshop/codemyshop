<!--
  @author    CodeMyShop <noreply@codemyshop.com>
  @copyright 2026 CodeMyShop
  @license   AGPL-3.0-or-later

  Bandeau démo affiché en haut du layout hub si le tenant a `isDemo: true`
  dans runtimeConfig.public. Pendant : DemoControlBar (front shop), ici =
  hub admin du tenant. Indique que les données sont réinitialisées la nuit
  via le cron 03:00 UTC (cf. travail codemyshop-demo-cron-reset).

  Bouton "Reset maintenant" (admin uniquement) → POST /api/admin/codemyshop-demo/reset.
-->
<script setup lang="ts">
const _cfg = useRuntimeConfig()
const isDemo = computed(() => Boolean((_cfg.public as any)?.isDemo))
const { user } = useAuth({ forceEmployee: true })
const isAdmin = computed(() => user.value?.user_type === 'employee' && user.value?.is_admin === true)

const resetting = ref(false)
const resetMsg = ref('')

async function reset() {
  if (!confirm('Réinitialiser la base démo maintenant ? Toutes les modifs en cours seront effacées.')) return
  resetting.value = true
  resetMsg.value = ''
  try {
    const res: any = await $fetch('/api/admin/codemyshop-demo/reset', { method: 'POST' })
    resetMsg.value = res?.success ? `Reset OK (${res.durationMs}ms)` : 'Reset KO'
    setTimeout(() => window.location.reload(), 1500)
  } catch (err: any) {
    resetMsg.value = `Erreur : ${err?.data?.message || err?.message || 'inconnue'}`
  } finally {
    resetting.value = false
  }
}
</script>

<template>
  <div
    v-if="isDemo"
    role="status"
    class="bg-red-600 text-white text-xs font-semibold px-4 py-1.5 flex items-center justify-center gap-3 shrink-0"
  >
    <span class="w-1.5 h-1.5 rounded-full bg-white animate-pulse" aria-hidden="true" />
    <span class="uppercase tracking-wider">Démo</span>
    <span class="font-normal opacity-90">— Données réinitialisées chaque nuit à 03:00 UTC.</span>
    <ClientOnly>
      <button
        v-if="isAdmin"
        type="button"
        :disabled="resetting"
        class="ml-2 px-2.5 py-0.5 rounded-full bg-white/15 hover:bg-white/25 disabled:opacity-50 transition-colors text-[11px] font-semibold"
        @click="reset"
      >
        {{ resetting ? 'Reset…' : 'Reset maintenant' }}
      </button>
      <span v-if="resetMsg" class="text-[11px] font-normal opacity-90">{{ resetMsg }}</span>
    </ClientOnly>
  </div>
</template>
