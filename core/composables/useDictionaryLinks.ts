/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * useDictionaryLinks — Auto-link dictionary terms in .prose content
 *
 * Scans the rendered article HTML for dictionary terms and wraps the first
 * occurrence of each term with a link to /dictionnaire/{slug}.
 * Skips headings, links, code blocks, and already-linked terms.
 */

interface DictionaryTerm {
  slug: string
  word: string
  definition: string
}

export function useDictionaryLinks() {
  const terms = ref<DictionaryTerm[]>([])
  const loaded = ref(false)

  async function fetchTerms() {
    if (loaded.value) return
    try {
      const data = await $fetch<{ entries: DictionaryTerm[] } | DictionaryTerm[]>('/api/dictionary')
      const entries = Array.isArray(data) ? data : (data?.entries ?? [])
      terms.value = entries
        .filter(t => t.word && t.slug)
        .sort((a, b) => b.word.length - a.word.length) // longest first to avoid partial matches
      loaded.value = true
    } catch { /* silent — dictionary links are enhancement, not critical */ }
  }

  function annotateProse(proseEl: Element) {
    if (!terms.value.length) return

    const linked = new Set<string>()
    const walker = document.createTreeWalker(proseEl, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement
        if (!parent) return NodeFilter.FILTER_REJECT
        const tag = parent.tagName
        // Skip headings, links, code, buttons, script, and already-annotated
        if (['H1', 'H2', 'H3', 'H4', 'A', 'CODE', 'PRE', 'BUTTON', 'SCRIPT'].includes(tag))
          return NodeFilter.FILTER_REJECT
        if (parent.closest('a, code, pre, h1, h2, h3, h4, .dict-term'))
          return NodeFilter.FILTER_REJECT
        return NodeFilter.FILTER_ACCEPT
      },
    })

    const textNodes: Text[] = []
    let current = walker.nextNode()
    while (current) {
      textNodes.push(current as Text)
      current = walker.nextNode()
    }

    for (const textNode of textNodes) {
      const text = textNode.textContent ?? ''
      if (text.trim().length < 3) continue

      for (const term of terms.value) {
        if (linked.has(term.slug)) continue

        // Build regex: match whole word, case-insensitive
        const escaped = term.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const regex = new RegExp(`\\b(${escaped})\\b`, 'i')
        const match = regex.exec(text)

        if (match && match.index !== undefined) {
          const before = text.slice(0, match.index)
          const matched = match[1]
          const after = text.slice(match.index + matched.length)

          const beforeNode = document.createTextNode(before)
          const afterNode = document.createTextNode(after)

          const link = document.createElement('a')
          link.href = `/dictionnaire/${term.slug}`
          link.className = 'dict-term'
          link.textContent = matched
          link.title = term.definition.slice(0, 120) + (term.definition.length > 120 ? '…' : '')
          link.setAttribute('data-dict', term.slug)

          const parent = textNode.parentNode!
          parent.insertBefore(beforeNode, textNode)
          parent.insertBefore(link, textNode)
          parent.insertBefore(afterNode, textNode)
          parent.removeChild(textNode)

          linked.add(term.slug)
          break // move to next text node after splitting
        }
      }
    }
  }

  return { fetchTerms, annotateProse, terms }
}
