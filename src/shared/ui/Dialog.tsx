import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Icon } from './Icon'

interface DialogProps {
  open: boolean
  onClose(): void
  title: string
  description?: ReactNode
  children?: ReactNode
  /** Botones del pie. */
  footer?: ReactNode
  /**
   * El contenido ya trae su propio `.dialog__body` y `.dialog__footer`
   * (p. ej. un formulario que necesita sus botones dentro del `<form>`).
   */
  bare?: boolean
  size?: 'sm' | 'md' | 'lg'
}

/** Ventana modal sobre `<dialog>` nativo: foco atrapado, Esc para cerrar y fondo inerte. */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  bare = false,
  size = 'md',
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className={`dialog dialog--${size}`}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onMouseDown={(event) => {
        // Clic en el fondo (fuera del contenido) cierra la ventana.
        if (event.target === event.currentTarget) onClose()
      }}
    >
      {open && (
        <div className="dialog__content">
          <header className="dialog__header">
            <div>
              <h2 id={titleId}>{title}</h2>
              {description && <p className="dialog__description">{description}</p>}
            </div>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar">
              <Icon name="close" />
            </button>
          </header>
          {bare ? children : children && <div className="dialog__body">{children}</div>}
          {footer && <footer className="dialog__footer">{footer}</footer>}
        </div>
      )}
    </dialog>
  )
}
