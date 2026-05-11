

export default defineNuxtPlugin(() => {
  const route = useRoute()
  const activeLang = useState<string>('active_lang', () => {
    return (route.params.lang as string) || 'fr'
  })

  
  watch(
    () => route.params.lang,
    (lang) => {
      activeLang.value = (lang as string) || 'fr'
    },
  )

  
  useHead({
    htmlAttrs: { lang: activeLang },
  })
})
