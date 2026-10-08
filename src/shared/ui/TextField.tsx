import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'

interface FieldShellProps {
  label: string
  hint?: string
  id?: string
  required?: boolean
  className?: string
  children(inputId: string, hintId: string | undefined): ReactNode
}

/** Etiqueta, control y ayuda con los ids enlazados para lectores de pantalla. */
function FieldShell({ label, hint, id, required, className, children }: FieldShellProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const hintId = hint ? `${inputId}-hint` : undefined

  return (
    <div className={['field', className].filter(Boolean).join(' ')}>
      <label htmlFor={inputId}>
        {label}
        {required && (
          <span className="field__required" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      {children(inputId, hintId)}
      {hint && (
        <small id={hintId} className="field__hint">
          {hint}
        </small>
      )}
    </div>
  )
}

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: string
}

export function TextField({ label, hint, id, className, ...props }: TextFieldProps) {
  return (
    <FieldShell label={label} hint={hint} id={id} required={props.required} className={className}>
      {(inputId, hintId) => (
        <input id={inputId} className="input" aria-describedby={hintId} {...props} />
      )}
    </FieldShell>
  )
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  hint?: string
}

export function SelectField({ label, hint, id, className, children, ...props }: SelectFieldProps) {
  return (
    <FieldShell label={label} hint={hint} id={id} required={props.required} className={className}>
      {(inputId, hintId) => (
        <select id={inputId} className="input" aria-describedby={hintId} {...props}>
          {children}
        </select>
      )}
    </FieldShell>
  )
}

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  hint?: string
}

export function TextAreaField({ label, hint, id, className, ...props }: TextAreaFieldProps) {
  return (
    <FieldShell label={label} hint={hint} id={id} required={props.required} className={className}>
      {(inputId, hintId) => (
        <textarea id={inputId} className="input" aria-describedby={hintId} rows={3} {...props} />
      )}
    </FieldShell>
  )
}
