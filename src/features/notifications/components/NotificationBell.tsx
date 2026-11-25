import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router'
import { getErrorMessage } from '@/shared/api/api-error'
import { Alert, Icon, Spinner } from '@/shared/ui'
import { useMarkAllNotificationsRead, useNotifications, useUnreadCount } from '../hooks/useNotifications'
import { useOpenNotification } from '../hooks/useOpenNotification'
import { NOTIFICATIONS_ROUTES } from '../routes'
import { NotificationItem } from './NotificationItem'
import '../pages/notifications.css'

interface NotificationBellProps {
  /** `sidebar`: fila del menú lateral (el panel se abre a la derecha). `topbar`: ícono de la barra móvil. */
  variant: 'sidebar' | 'topbar'
  /** Menú contraído: solo el ícono. */
  collapsed?: boolean
}

const PANEL_WIDTH = 380
const GAP = 8

export function formatBadge(count: number): string {
  return count > 99 ? '99+' : String(count)
}

/** Campana con el número de no leídas y un panel con las 10 últimas. */
export function NotificationBell({ variant, collapsed = false }: NotificationBellProps) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<CSSProperties>({})
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const { pathname } = useLocation()
  const unread = useUnreadCount()
  const count = unread.data?.count ?? 0

  // Se cierra al cambiar de pantalla.
  useEffect(() => setOpen(false), [pathname])

  // Posición del panel junto al botón (fixed: el menú lateral tiene scroll propio).
  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return
    const place = () => {
      const rect = buttonRef.current!.getBoundingClientRect()
      const vw = window.innerWidth
      if (vw < 520) {
        setPosition({ top: rect.bottom + GAP, left: GAP, right: GAP })
      } else if (variant === 'sidebar') {
        setPosition({
          left: Math.min(rect.right + GAP, vw - PANEL_WIDTH - GAP),
          bottom: Math.max(GAP, window.innerHeight - rect.bottom),
          width: PANEL_WIDTH,
        })
      } else {
        setPosition({ top: rect.bottom + GAP, right: Math.max(GAP, vw - rect.right), width: PANEL_WIDTH })
      }
    }
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [open, variant])

  // Clic afuera o Esc: se cierra.
  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node
      if (!panelRef.current?.contains(target) && !buttonRef.current?.contains(target)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const label = count > 0 ? `Notificaciones: ${count} sin leer` : 'Notificaciones'

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={variant === 'sidebar' ? 'layout__user-link bell bell--sidebar' : 'bell bell--topbar'}
        aria-label={label}
        title={collapsed || variant === 'topbar' ? label : undefined}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="bell__icon">
          <Icon name="bell" size={variant === 'sidebar' ? 16 : 22} />
          {count > 0 && <span className="bell__badge">{formatBadge(count)}</span>}
        </span>
        {variant === 'sidebar' && <span className="layout__label">Notificaciones</span>}
      </button>
      {open &&
        createPortal(
          <div ref={panelRef} className="bell-panel" role="dialog" aria-label="Notificaciones" style={position}>
            <BellPanel unreadCount={count} onClose={() => setOpen(false)} />
          </div>,
          document.body,
        )}
    </>
  )
}

function BellPanel({ unreadCount, onClose }: { unreadCount: number; onClose(): void }) {
  const { data, isPending, isError, error } = useNotifications({ limit: 10 })
  const markAll = useMarkAllNotificationsRead()
  const open = useOpenNotification()

  return (
    <>
      <header className="bell-panel__header">
        <strong>Notificaciones</strong>
        {unreadCount > 0 && (
          <button
            type="button"
            className="link-button"
            disabled={markAll.isPending}
            onClick={() => markAll.mutate()}
          >
            Marcar todas como leídas
          </button>
        )}
      </header>
      <div className="bell-panel__body">
        {isPending && <Spinner />}
        {isError && <Alert tone="error">{getErrorMessage(error)}</Alert>}
        {data && data.items.length === 0 && (
          <div className="empty">
            <Icon name="bell" size={26} />
            No tiene notificaciones.
          </div>
        )}
        {data && data.items.length > 0 && (
          <ul className="notification-list">
            {data.items.map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                onOpen={(notification) => {
                  onClose()
                  open(notification)
                }}
              />
            ))}
          </ul>
        )}
      </div>
      <footer className="bell-panel__footer">
        <Link to={NOTIFICATIONS_ROUTES.list} onClick={onClose}>
          Ver todas <Icon name="chevronRight" size={14} />
        </Link>
      </footer>
    </>
  )
}
