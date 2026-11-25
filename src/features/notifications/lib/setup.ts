import { onAfterLogin, onBeforeLogout } from '@/shared/lib/session-hooks'
import { detachPushBeforeLogout, registerServiceWorker, resyncPushAfterLogin } from './push'

/**
 * Se llama una vez al arrancar la app: registra el service worker de los push y los conecta
 * con la sesión. Al entrar, la suscripción de este navegador pasa al usuario actual; al salir,
 * se quita del servidor mientras el token todavía es válido.
 */
export function setupNotifications() {
  registerServiceWorker()
  onAfterLogin(resyncPushAfterLogin)
  onBeforeLogout(detachPushBeforeLogout)
}
