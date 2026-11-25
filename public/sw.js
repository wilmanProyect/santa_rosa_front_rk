// Service worker de Santa Rosa: recibe las notificaciones push y abre la pantalla al tocarlas.
// Se sirve desde la raíz del sitio y sin caché (nginx pone `no-cache` en `location /`).
// Las rutas deben coincidir con src/features/notifications/lib/notification-url.ts.

const ROUTES = {
  BREEDING_SERVICE: (t) => `/reproduccion/montas/${t.id}`,
  CONTROLS: (t) => `/controles?tipo=${t.filter ?? 'WEANING'}`,
}

const urlFor = (target) =>
  target && ROUTES[target.type] && (target.type !== 'BREEDING_SERVICE' || target.id)
    ? ROUTES[target.type](target)
    : '/notificaciones'

// Toma el control apenas se instala una versión nueva.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : '' }
  }
  event.waitUntil(
    (async () => {
      await self.registration.showNotification(data.title ?? 'Santa Rosa', {
        body: data.body ?? '',
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        tag: data.id, // el mismo aviso no se apila dos veces
        data: { url: urlFor(data.target) },
      })
      // Avisa a las pestañas abiertas para que actualicen la campana.
      for (const client of await self.clients.matchAll({ type: 'window' })) {
        client.postMessage({ type: 'notification-received' })
      }
    })(),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/'
  event.waitUntil(
    (async () => {
      for (const client of await self.clients.matchAll({ type: 'window', includeUncontrolled: true })) {
        if ('focus' in client) {
          await client.focus()
          client.postMessage({ type: 'navigate', url })
          return
        }
      }
      await self.clients.openWindow(url)
    })(),
  )
})
