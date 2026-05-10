<!--
  @author    CodeMyShop <noreply@codemyshop.com>
  @copyright 2026 CodeMyShop
  @license   AGPL-3.0-or-later

  Éditeur section Instagram — config CTA + statut connexion Graph API +
  bouton Re-sync (invalide cache Nitro).
-->
<template>
  <div class="space-y-3">

    <!-- ── Config CTA (url / handle) ────────────────────────────── -->
    <fieldset class="border border-gray-200 rounded-xl p-3 space-y-2">
      <legend class="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">CTA bouton</legend>
      <div>
        <label class="field-label">Lien Instagram</label>
        <input
          :value="localPayload.url ?? ''"
          type="url" class="field" placeholder="https://instagram.com/example_fruits_secs"
          @input="updateField('url', ($event.target as HTMLInputElement).value)"
        >
      </div>
      <div>
        <label class="field-label">Handle (@)</label>
        <input
          :value="localPayload.handle ?? ''"
          type="text" class="field" placeholder="@example_fruits_secs"
          @input="updateField('handle', ($event.target as HTMLInputElement).value)"
        >
      </div>
    </fieldset>

    <!-- ── Statut connexion Graph API ───────────────────────────── -->
    <fieldset class="border border-gray-200 rounded-xl p-3 space-y-2">
      <legend class="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">Connexion API</legend>

      <div v-if="statusLoading" class="flex items-center gap-2 text-xs text-gray-500 py-2">
        <svg class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Vérification…
      </div>

      <div v-else-if="!status?.connected" class="rounded-lg bg-amber-50 border border-amber-200 p-2.5">
        <p class="text-xs font-semibold text-amber-800 mb-1">Non connecté</p>
        <p class="text-[11px] text-amber-700 leading-snug">
          {{ status?.reason || 'Token Instagram Graph API absent ou invalide.' }}
        </p>
        <p class="text-[10px] text-amber-600 mt-1.5 leading-snug">
          Générer via <code class="font-mono">./scripts/instagram-token-setup.sh</code> puis coller dans <code class="font-mono">.env</code> du VPS tenant.
        </p>
      </div>

      <div v-else class="space-y-2">
        <div class="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-2.5">
          <svg class="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-semibold text-emerald-800 truncate">
              @{{ status.username }}
            </p>
            <p class="text-[10px] text-emerald-600 truncate">ID: {{ status.userId }}</p>
          </div>
        </div>

        <div
          v-if="status.expiresAt"
          class="rounded-lg p-2.5 text-[11px] leading-snug"
          :class="expiryClass"
        >
          <p class="font-semibold">
            <template v-if="status.daysRemaining! > 7">Token valide</template>
            <template v-else-if="status.daysRemaining! > 0">⚠️ Rotation imminente</template>
            <template v-else>❌ Token expiré</template>
          </p>
          <p>
            Expire le <strong>{{ expiryFormatted }}</strong>
            <span v-if="status.daysRemaining !== null">
              ({{ status.daysRemaining > 0 ? `${status.daysRemaining}j restants` : 'expiré' }})
            </span>
          </p>
          <p v-if="status.daysRemaining! <= 7" class="mt-1 opacity-80">
            Re-générer via <code class="font-mono">./scripts/instagram-token-setup.sh</code>
          </p>
        </div>

        <div v-else class="rounded-lg bg-gray-50 border border-gray-200 p-2.5 text-[11px] text-gray-600 leading-snug">
          Expiration inconnue (creds APP_ID/APP_SECRET absents côté Nuxt).
        </div>
      </div>
    </fieldset>

    <!-- ── Re-sync cache ────────────────────────────────────────── -->
    <fieldset class="border border-gray-200 rounded-xl p-3 space-y-2">
      <legend class="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">Cache feed</legend>
      <p class="text-[11px] text-gray-500 leading-snug">
        Le feed est mis en cache 1&nbsp;h. Lance une re-sync manuelle si tu viens de
        publier un post et veux qu'il apparaisse tout de suite.
      </p>
      <button
        type="button"
        :disabled="resyncLoading || !status?.connected"
        class="w-full flex items-center justify-center gap-2 text-xs font-semibold py-2 rounded-lg transition-colors"
        :class="resyncLoading || !status?.connected
          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
          : 'bg-primary-600 text-white hover:bg-primary-700'"
        @click="doResync"
      >
        <svg v-if="resyncLoading" class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <svg v-else class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
        </svg>
        {{ resyncLoading ? 'Re-sync en cours…' : 'Re-sync depuis Instagram' }}
      </button>

      <div
        v-if="resyncResult"
        class="rounded-lg p-2 text-[11px] leading-snug"
        :class="resyncResult.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'"
      >
        <template v-if="resyncResult.ok">
          ✓ {{ resyncResult.refetchedItems }} posts rafraîchis, cache purgé ({{ resyncResult.purgedKeys }} entrées).
        </template>
        <template v-else>
          ✗ Re-sync échouée.
        </template>
      </div>
    </fieldset>

  </div>
</template>

<script setup lang="ts">
interface InstagramStatus {
  connected:     boolean
  username:      string | null
  userId:        string | null
  expiresAt:     number | null
  daysRemaining: number | null
  reason:        string | null
}

const props = defineProps<{
  payload: any
}>()

const emit = defineEmits<{ 'update:payload': [value: any] }>()

const localPayload = computed(() => props.payload || {})

function updateField(key: string, value: any) {
  emit('update:payload', { ...localPayload.value, [key]: value })
}

// Statut connexion
const statusLoading = ref(true)
const status        = ref<InstagramStatus | null>(null)

async function fetchStatus() {
  statusLoading.value = true
  try {
    status.value = await $fetch<InstagramStatus>('/api/instagram/status')
  } catch {
    status.value = null
  } finally {
    statusLoading.value = false
  }
}

// Re-sync
const resyncLoading = ref(false)
const resyncResult  = ref<{ ok: boolean; purgedKeys: number; refetchedItems: number } | null>(null)

async function doResync() {
  resyncLoading.value = true
  resyncResult.value = null
  try {
    const res = await $fetch<{ ok: boolean; purgedKeys: number; refetchedItems: number }>('/api/instagram/resync', {
      method: 'POST',
    })
    resyncResult.value = res
    // Refresh the status (token may have been updated)
    await fetchStatus()
  } catch {
    resyncResult.value = { ok: false, purgedKeys: 0, refetchedItems: 0 }
  } finally {
    resyncLoading.value = false
  }
}

const expiryFormatted = computed(() => {
  if (!status.value?.expiresAt) return ''
  return new Date(status.value.expiresAt * 1000).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
})

const expiryClass = computed(() => {
  const d = status.value?.daysRemaining
  if (d === null || d === undefined) return 'bg-gray-50 text-gray-600 border border-gray-200'
  if (d <= 0)  return 'bg-rose-50 text-rose-700 border border-rose-200'
  if (d <= 7)  return 'bg-amber-50 text-amber-800 border border-amber-200'
  return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
})

onMounted(() => {
  fetchStatus()
})
</script>
