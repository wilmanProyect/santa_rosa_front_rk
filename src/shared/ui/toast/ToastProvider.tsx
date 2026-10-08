import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { Icon } from '../Icon'
import { ToastContext, type ToastTone } from './toast-context'

interface Toast {
  id: number
  message: string
  tone: ToastTone
}

const DURATION_MS = 4500
let nextId = 1

/** Avisos breves que confirman el resultado de una acción. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id))
  }, [])

  const show = useCallback(
    (message: string, tone: ToastTone = 'success') => {
      const id = nextId++
      setToasts((current) => [...current, { id, message, tone }])
      setTimeout(() => dismiss(id), DURATION_MS)
    },
    [dismiss],
  )

  const value = useMemo(() => ({ show }), [show])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-region" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast--${toast.tone}`} role="status">
            <Icon name={toast.tone === 'error' ? 'close' : 'check'} />
            <span>{toast.message}</span>
            <button
              type="button"
              className="icon-btn"
              onClick={() => dismiss(toast.id)}
              aria-label="Cerrar aviso"
            >
              <Icon name="close" size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
