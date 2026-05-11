

import type { Component } from 'vue'

export interface SlotEntry {
  component: Component
  
  moduleId: string
  
  priority?: number
}

const slotRegistry = new Map<string, SlotEntry[]>()

export const useDisplaySlot = () => {
  
  function provideSlot(name: string, entry: SlotEntry): void {
    if (!slotRegistry.has(name)) slotRegistry.set(name, [])
    slotRegistry.get(name)!.push(entry)
    slotRegistry.get(name)!.sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100))
  }

  
  function getSlotEntries(name: string): SlotEntry[] {
    return slotRegistry.get(name) ?? []
  }

  
  function listRegisteredSlots(): Record<string, number> {
    const out: Record<string, number> = {}
    for (const [name, entries] of slotRegistry) out[name] = entries.length
    return out
  }

  return { provideSlot, getSlotEntries, listRegisteredSlots }
}
