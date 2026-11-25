import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { notificationsKeys } from '../hooks/useNotifications'

/**
 * Mensajes del service worker (`public/sw.js`) a la pestaña abierta:
 * - `notification-received`: llegó un push → se actualiza la campana;
 * - `navigate`: se tocó una notificación → se va a su pantalla.
 * Va dentro del router (usa `navigate`). No dibuja nada.
 */
export function PushBridge() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; url?: string } | null
      if (data?.type === 'notification-received') {
        void queryClient.invalidateQueries({ queryKey: notificationsKeys.all })
      } else if (data?.type === 'navigate' && typeof data.url === 'string' && data.url.startsWith('/')) {
        void queryClient.invalidateQueries({ queryKey: notificationsKeys.all })
        navigate(data.url)
      }
    }
    navigator.serviceWorker.addEventListener('message', onMessage)
    return () => navigator.serviceWorker.removeEventListener('message', onMessage)
  }, [navigate, queryClient])

  return null
}
