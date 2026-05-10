<!--
  @author    CodeMyShop <noreply@codemyshop.com>
  @copyright 2026 CodeMyShop
  @license   AGPL-3.0-or-later

  ImpersonationBanner — bandeau orange permanent affiché en haut de TOUTES
  les pages quand un commercial est en session d'impersonation B2B
  (verticale food, brique food-impersonate).

  Lit /api/impersonate/active au montage + refresh toutes les 60s pour
  capturer l'auto-expire 2h. Bouton "Quitter" → POST /api/impersonate/stop.

  Visible uniquement si une session active existe — sinon ne rend rien.
-->
<template>
  <div
    v-if="active"
    role="status"
    aria-live="polite"
    class="sticky top-0 z-50 w-full bg-orange-500 text-white shadow-md"
  >
    <div class="px-4 py-2 flex items-center gap-3 text-sm">
      <span class="text-lg" aria-hidden="true">🎭</span>
      <p class="flex-1 font-medium leading-tight">
        Connecté en tant que
        <span class="font-bold">{{ active.customerLabel || active.customerEmail || ('client #' + active.idCustomer) }}</span>
        <span class="text-orange-100 ml-2 text-xs">
          (session #{{ active.idSession }} · expire à {{ formatTime(active.expiresAt) }})
        </span>
      </p>
      <button
        type="button"
        @click="quit"
        :disabled="busy"
        class="text-xs px-3 py-1 rounded-md bg-white/15 hover:bg-white/25 disabled:opacity-50 font-semibold border border-white/30"
      >
        {{ busy ? 'Sortie…' : 'Quitter' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

interface ActiveSession {
  idSession: number
  idEmployee: number
  idCustomer: number
  customerEmail: string | null
  customerLabel: string | null
  startedAt: string
  expiresAt: string
}

const active = ref<ActiveSession | null>(null)
const busy = ref(false)
let pollHandle: ReturnType<typeof setInterval> | null = null

async function load() {
  try {
    const res = await $fetch<{ active: ActiveSession | null }>('/api/impersonate/active', {
      credentials: 'include',
    })
    active.value = res?.active ?? null
  } catch {
    active.value = null
  }
}

async function quit() {
  if (busy.value) return
  busy.value = true
  try {
    await $fetch('/api/impersonate/stop', {
      method: 'POST',
      credentials: 'include',
      body: { closeReason: 'manual' },
    })
    active.value = null
    // Hard reload: we want all in-flight requests to fetch a
    // dedicated identity (cart, addresses, etc.) rather than a mixed state.
    if (typeof window !== 'undefined') window.location.reload()
  } catch (err) {
    console.error('[ImpersonationBanner] stop error', err)
  } finally {
    busy.value = false
  }
}

function formatTime(iso: string): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso.slice(11, 16)
  }
}

onMounted(() => {
  load()
  pollHandle = setInterval(load, 60_000)
})

onBeforeUnmount(() => {
  if (pollHandle) clearInterval(pollHandle)
})
</script>
