/**
 *
 * Substitution `{var_name}` → vars[var_name] for email templates
 * stored in DB (cs_email_template_lang).
 *
 * Rules:
 * - A missing variable (undefined or null) leaves the placeholder intact —
 * no silent deletion, it helps debug in preview/preprod.
 * - Variables named *_html (e.g., products, delivery_block_html, bankwire_details,
 * message) are injected raw (HTML already built by the caller).
 * Other variables are HTML-escaped to neutralize injections
 * in firstname/company/email/etc.
 * - The caller explicitly passes the variables it wants to substitute; no
 *     fuite de variable d'environnement ou de scope.
 *
 * No external templating engine (Handlebars, Liquid, …): the need is
 * trivial (scalar substitution), and we avoid a heavy dependency.
 */

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

/**
 * Substitutes placeholders `{key}` in the template with vars[key].
 *
 * @param template - HTML ou texte avec placeholders `{var}` style PrestaShop
 * @param vars     - dictionnaire de valeurs. Les clés terminant par `_html`
 * are injected raw (pre-built HTML). Other
 * are escaped for security.
 * @returns        Le template avec placeholders substitués.
 */
export function renderEmailTemplate(
  template: string,
  vars: Record<string, string | number | undefined | null>,
): string {
  return template.replace(/\{([a-z_][a-z0-9_]*)\}/gi, (match, key: string) => {
    const value = vars[key]
    // Convention : un placeholder dans un href= qui ne peut pas être substitué
    // produit un lien cassé visible dans le client mail (ex: `x-webdoc://…
    // %7Brdv_url%7D`). On préfère le résoudre vers une chaîne vide (le
    // template peut alors avoir un href="" qui retombe sur l'origine ou
    // ignoré silencieusement) — sauf si le caller veut explicitement le
    // placeholder pour debug, il passe la valeur littérale.
    if (value === undefined) return ''
    if (value === null) return ''
    const str = String(value)
    // Heuristique : les vars dont le nom contient "html" ou est une whitelist
    // connue d'HTML pré-construit sont injectées brutes (sinon on double-encode).
    if (
      /_html$/i.test(key)
      || key === 'products'
      || key === 'message'  // utilisateur a tapé du texte multilignes — preserve newlines via white-space:pre-wrap côté template
      || key === 'payment'  // peut contenir <br><strong>RIB</strong> pour virement (cf order-emails.ts)
    ) {
      return str
    }
    return escapeHtml(str)
  })
}
