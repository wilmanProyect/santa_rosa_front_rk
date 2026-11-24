import { useSyncExternalStore } from 'react'
import { storage } from './storage'

/** Preferencia de apariencia. `system` sigue la del sistema operativo. */
export type ThemePreference = 'light' | 'dark' | 'system'

/** Misma clave que lee el script de index.html para aplicar el tema antes de pintar. */
const THEME_KEY = 'sr.theme'
const DARK_QUERY = '(prefers-color-scheme: dark)'

function readPreference(): ThemePreference {
  const value = storage.get(THEME_KEY)
  return value === 'light' || value === 'dark' ? value : 'system'
}

let current: ThemePreference = readPreference()
const listeners = new Set<() => void>()

function systemIsDark(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(DARK_QUERY).matches
}

/** Pone `data-theme` en <html>: los estilos del modo oscuro dependen de ese atributo. */
function applyTheme() {
  const dark = current === 'dark' || (current === 'system' && systemIsDark())
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
}

/** Se llama una vez al arrancar: aplica el tema y sigue los cambios del sistema (modo `system`). */
export function initTheme() {
  applyTheme()
  if (typeof window.matchMedia === 'function') {
    window.matchMedia(DARK_QUERY).addEventListener('change', () => {
      if (current === 'system') applyTheme()
    })
  }
}

export function setThemePreference(next: ThemePreference) {
  current = next
  if (next === 'system') storage.remove(THEME_KEY)
  else storage.set(THEME_KEY, next)
  applyTheme()
  listeners.forEach((notify) => notify())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Preferencia de tema guardada en este navegador. */
export function useThemePreference() {
  return useSyncExternalStore(subscribe, () => current)
}
