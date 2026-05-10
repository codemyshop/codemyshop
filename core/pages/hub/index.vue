<script setup lang="ts">
definePageMeta({ ssr: false, middleware: 'crm-auth' })
navigateTo('/hub/dashboard', { replace: true })
</script>
