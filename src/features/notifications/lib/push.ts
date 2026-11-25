import { pushApi } from '../api/notifications.api'
import type { PushSubscriptionBody } from '../types/notifications.types'

/**
 * Notificaciones push del navegador. Llegan aunque la página esté cerrada (las muestra
 * `public/sw.js`). Requieren HTTPS o `localhost`. En iPhone/iPad, solo si la página se
 * agregó a la pantalla de inicio (iOS 16.4+).
 */
export type PushStatus = 'enabled' | 'disabled' | 'denied' | 'unsupported'

const SW_URL = '/sw.js'

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

/** Se llama una vez al arrancar la app. */
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return
  navigator.serviceWorker.register(SW_URL).catch(() => {
    // Sin service worker (p. ej. http fuera de localhost): la campana sigue funcionando.
  })
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0))
}

async function currentSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null
  const registration = await navigator.serviceWorker.getRegistration(SW_URL)
  return registration ? registration.pushManager.getSubscription() : null
}

const toBody = (subscription: PushSubscription) => subscription.toJSON() as PushSubscriptionBody

export async function getPushStatus(): Promise<PushStatus> {
  if (!isPushSupported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  if (Notification.permission !== 'granted') return 'disabled'
  return (await currentSubscription()) ? 'enabled' : 'disabled'
}

/** Pide el permiso: llamarlo solo al tocar el botón (los navegadores bloquean los pedidos automáticos). */
export async function enablePush(): Promise<PushStatus> {
  if (!isPushSupported()) return 'unsupported'
  if ((await Notification.requestPermission()) !== 'granted') {
    return Notification.permission === 'denied' ? 'denied' : 'disabled'
  }
  const registration = await navigator.serviceWorker.ready
  const { publicKey } = await pushApi.publicKey()
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }))
  await pushApi.subscribe(toBody(subscription))
  return 'enabled'
}

export async function disablePush(): Promise<void> {
  const subscription = await currentSubscription()
  if (!subscription) return
  try {
    await pushApi.unsubscribe(subscription.endpoint)
  } finally {
    await subscription.unsubscribe()
  }
}

/**
 * Al iniciar sesión: si este navegador ya estaba suscrito, la suscripción pasa al usuario
 * actual (el equipo pudo haber cambiado de usuario).
 */
export async function resyncPushAfterLogin(): Promise<void> {
  if (!isPushSupported() || Notification.permission !== 'granted') return
  const subscription = await currentSubscription()
  if (subscription) await pushApi.subscribe(toBody(subscription))
}

/**
 * Al cerrar sesión, **antes** de borrar el token: el servidor deja de enviar a este navegador,
 * para que el próximo usuario del equipo no reciba los avisos del anterior. La suscripción del
 * navegador se conserva y se vuelve a asociar en el próximo login.
 */
export async function detachPushBeforeLogout(): Promise<void> {
  const subscription = await currentSubscription()
  if (subscription) await pushApi.unsubscribe(subscription.endpoint)
}

export function sendTestPush() {
  return pushApi.test()
}
