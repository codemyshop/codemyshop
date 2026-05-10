/**
 *
 * Color mode — STUB no-op.
 *
 * Doctrine 2026-05-10: universal light mode everywhere (storefront and hub, all tenants).
 * No more dark, no more toggle, no more localStorage. `isDark` remains exposed
 * to avoid breaking existing reactive bindings in components,
 * but remains frozen at `false`. The `.dark` class is never applied to
 * <html>. Tailwind `dark:*` usages throughout the code become
 * dead code (to be purged later if technical debt becomes problematic).
 */

export const useDarkMode = () => {
  const isDark = useState('dark_mode', () => false)

  function init(_defaultColorMode?: 'light' | 'dark' | 'system', _respectUserPref = true) {
    /* no-op : light universel */
  }

  function toggle() {
    /* no-op : doctrine light only */
  }

  return { isDark, init, toggle }
}
