interface Identifiable {
  earTag: string | null
  name: string | null
  absidRegistry?: string | null
}

/** "A-102 — Lucero", o lo que haya para identificarlo (los externos pueden no tener arete). */
export function animalLabel(animal: Identifiable): string {
  const parts = [animal.earTag, animal.name].filter(Boolean)
  if (parts.length > 0) return parts.join(' — ')
  return animal.absidRegistry ? `ABSID ${animal.absidRegistry}` : 'Sin identificación'
}
