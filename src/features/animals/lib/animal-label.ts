interface Identifiable {
  earTag: string | null
  name: string | null
  absidRegistry?: string | null
  externalRegistry?: string | null
  isExternal?: boolean
}

/** "A-102 — Lucero", o lo que haya para identificarlo (los externos pueden no tener arete). */
export function animalLabel(animal: Identifiable): string {
  const parts = [animal.earTag, animal.name].filter(Boolean)
  if (parts.length > 0) return parts.join(' — ')
  // Un reproductor externo se identifica por su registro externo ABSID, no por el ABSID propio.
  const registry = animal.isExternal ? animal.externalRegistry : animal.absidRegistry
  return registry ? `ABSID ${registry}` : 'Sin identificación'
}
