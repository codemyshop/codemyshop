

const HTML_ENTITIES: Record<string, string> = {
  '&':  '&amp;',
  '<':  '&lt;',
  '>':  '&gt;',
  '"':  '&quot;',
  "'":  '&#39;',
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => HTML_ENTITIES[c] ?? c)
}

export function renderEmailTemplate(
  template: string,
  vars: Record<string, string | number | undefined | null>,
): string {
  return template.replace(/\{([a-z_][a-z0-9_]*)\}/gi, (match, key: string) => {
    const value = vars[key]
    
    
    
    
    
    
    if (value === undefined) return ''
    if (value === null) return ''
    const str = String(value)
    
    
    if (
      /_html$/i.test(key)
      || key === 'products'
      || key === 'message'  
      || key === 'payment'  
    ) {
      return str
    }
    return escapeHtml(str)
  })
}
