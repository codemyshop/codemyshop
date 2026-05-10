/**
 * Display slots on the front end — `display*` primitive of the hooks system.
 *
 * Modules register a Vue component to display in a named slot
 * exposed by the core or another module. Multiple modules can
 * contribute to the same slot — their components appear in order
 * d'enregistrement.
 *
 * Pattern :
 * <!-- on the core/another module side -->
 *   <HookSlot name="displayLeadDetail:after-info" :context="lead" />
 *
 * <!-- on the module side that wants to inject (e.g. enterprise/base/lead-capa) -->
 *   provideSlot('displayLeadDetail:after-info', LeadCapaPanel)
 *
 * Chantier codemyshop-oss Phase 1 (2026-05-10).
 */
import type { Component } from 'vue'

export interface SlotEntry {
  component: Component
  /** Module ID qui a enregistré le slot (debug + ordre). */
  moduleId: string
  /** Priority (asc) — default 100. Allows reordering the display order. */
  priority?: number
}

const slotRegistry = new Map<string, SlotEntry[]>()

export const useDisplaySlot = () => {
  /** Register a component for a named slot. */
  function provideSlot(name: string, entry: SlotEntry): void {
    if (!slotRegistry.has(name)) slotRegistry.set(name, [])
    slotRegistry.get(name)!.push(entry)
    slotRegistry.get(name)!.sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100))
  }

  /** List registered components for a slot — used by <HookSlot>. */
  function getSlotEntries(name: string): SlotEntry[] {
    return slotRegistry.get(name) ?? []
  }

  /** Introspection (debug + admin). */
  function listRegisteredSlots(): Record<string, number> {
    const out: Record<string, number> = {}
    for (const [name, entries] of slotRegistry) out[name] = entries.length
    return out
  }

  return { provideSlot, getSlotEntries, listRegisteredSlots }
}
