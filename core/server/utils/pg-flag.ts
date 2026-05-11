

let cached: { set: Set<string>; wildcard: boolean } | null = null

function load(): { set: Set<string>; wildcard: boolean } {
  if (cached) return cached
  const raw = process.env.PG_ENABLED_DOMAINS || ''
  const tokens = raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  cached = {
    set: new Set(tokens.filter((t) => t !== '*')),
    wildcard: tokens.includes('*'),
  }
  return cached
}

export function isDomainOnPg(domain: string): boolean {
  const { set, wildcard } = load()
  return wildcard || set.has(domain.toLowerCase())
}

export function _resetPgFlagCache(): void {
  cached = null
}
