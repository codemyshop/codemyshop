

export type AuditMode = 'shadow' | 'active'

function readMode(value: string | undefined): AuditMode | null {
  if (!value) return null
  const v = value.trim().toLowerCase()
  if (v === 'active' || v === 'on' || v === '1') return 'active'
  if (v === 'shadow' || v === 'off' || v === '0' || v === 'dry-run') return 'shadow'
  return null
}

export function getAuditMode(automateKey?: string): AuditMode {
  if (automateKey) {
    const overrideKey = `AUDIT_MODE_${automateKey.toUpperCase()}`
    const override = readMode(process.env[overrideKey])
    if (override !== null) return override
  }
  const global = readMode(process.env.AUDIT_MODE)
  if (global !== null) return global
  return 'shadow'
}

export function isShadow(automateKey?: string): boolean {
  return getAuditMode(automateKey) === 'shadow'
}

export function isActive(automateKey?: string): boolean {
  return getAuditMode(automateKey) === 'active'
}
