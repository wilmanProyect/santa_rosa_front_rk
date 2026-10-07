/** Acceso a localStorage que no falla en modo privado o con almacenamiento bloqueado. */
export const storage = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  set(key: string, value: string) {
    try {
      localStorage.setItem(key, value)
    } catch {
      // Sin almacenamiento disponible: la sesión dura solo mientras la pestaña esté abierta.
    }
  },
  remove(key: string) {
    try {
      localStorage.removeItem(key)
    } catch {
      // Ignorar
    }
  },
}
