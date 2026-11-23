import type { MouseEvent, ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { Icon } from './Icon'

/**
 * Indica si hay una página anterior de la app en el historial. React Router asigna la
 * clave `default` a la primera entrada (enlace abierto directo, pestaña nueva, recarga
 * sin historial); cualquier otra clave significa que se llegó navegando dentro de la app.
 */
export function useHasAppHistory() {
  return useLocation().key !== 'default'
}

/**
 * Vuelve a la página anterior del historial (igual que el botón "atrás" del navegador).
 * Si no hay una página anterior de la app, va a `fallback`.
 */
export function useGoBack(fallback: string) {
  const navigate = useNavigate()
  const hasHistory = useHasAppHistory()
  return () => {
    if (hasHistory) navigate(-1)
    else navigate(fallback, { replace: true })
  }
}

interface BackLinkProps {
  /** Destino cuando no hay página anterior (y para abrir en otra pestaña). */
  to: string
  /** Texto cuando se vuelve a `to`. Si se vuelve por el historial se muestra "Volver". */
  children: ReactNode
}

/** Enlace "← Volver" de la cabecera: respeta el camino por el que llegó el usuario. */
export function BackLink({ to, children }: BackLinkProps) {
  const hasHistory = useHasAppHistory()
  const goBack = useGoBack(to)

  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    // Ctrl/Cmd/Shift-clic o botón medio: se deja abrir `to` en otra pestaña.
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    goBack()
  }

  return (
    <Link to={to} onClick={handleClick}>
      <Icon name="arrowLeft" size={14} /> {hasHistory ? 'Volver' : children}
    </Link>
  )
}
