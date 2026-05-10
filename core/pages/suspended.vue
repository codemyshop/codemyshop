<template>
  <div class="min-h-screen bg-gray-900 flex items-center justify-center p-6">
    <div class="max-w-md w-full text-center">
      <div class="w-16 h-16 rounded-2xl bg-amber-500/20 flex items-center justify-center mx-auto mb-6">
        <svg class="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
      </div>
      <h1 class="text-2xl font-extrabold text-white mb-3">Licence suspendue</h1>
      <p class="text-gray-400 leading-relaxed mb-8">
        Votre licence n&eacute;cessite un renouvellement.
        Votre boutique PrestaShop reste pleinement fonctionnelle.
        Seul le Hub IA est temporairement d&eacute;sactiv&eacute;.
      </p>
      <div class="space-y-3">
        <a :href="`mailto:${supportEmail}?subject=Renouvellement licence`"
           class="block w-full py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-colors">
          Contacter le support
        </a>
        <a href="/"
           class="block w-full py-3 border border-gray-700 text-gray-400 hover:text-white rounded-xl transition-colors">
          Retour au site
        </a>
      </div>
      <p class="mt-8 text-xs text-gray-600">
        {{ brandName }} &mdash; {{ supportEmail }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })
const { public: publicConfig } = useRuntimeConfig()
const brandName = publicConfig.brandName as string || 'Boutique'
const supportEmail = publicConfig.supportEmail as string || publicConfig.contactEmail as string || ''
</script>
