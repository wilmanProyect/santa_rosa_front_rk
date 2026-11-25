/**
 * Ganchos del ciclo de la sesión, para que otras features reaccionen al login o al logout
 * sin que `auth` dependa de ellas (p. ej. las notificaciones push).
 */
type Hook = () => Promise<unknown> | unknown

const afterLogin = new Set<Hook>()
const beforeLogout = new Set<Hook>()

/** Se ejecuta después de iniciar sesión (con el token ya guardado). */
export function onAfterLogin(hook: Hook) {
  afterLogin.add(hook)
  return () => afterLogin.delete(hook)
}

/** Se ejecuta antes de cerrar la sesión, mientras el token todavía es válido. */
export function onBeforeLogout(hook: Hook) {
  beforeLogout.add(hook)
  return () => beforeLogout.delete(hook)
}

/** No bloquea el login: los errores de los ganchos se ignoran. */
export function runAfterLogin() {
  for (const hook of afterLogin) {
    Promise.resolve()
      .then(hook)
      .catch(() => {})
  }
}

/** Espera a los ganchos (como mucho `timeoutMs`) para no trabar el cierre de sesión. */
export async function runBeforeLogout(timeoutMs = 4000) {
  const all = Promise.allSettled([...beforeLogout].map((hook) => Promise.resolve().then(hook)))
  await Promise.race([all, new Promise((resolve) => setTimeout(resolve, timeoutMs))])
}
