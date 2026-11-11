import { useState, type FormEvent } from 'react'
import { getErrorMessage } from '@/shared/api/api-error'
import { Alert, Button, Dialog, TextAreaField, useToast } from '@/shared/ui'
import { useResolveReview } from '../hooks/useReviews'
import type { DataReview } from '../types/review.types'

interface ResolveReviewDialogProps {
  review: DataReview | null
  onClose(): void
}

/** Marca un aviso como corregido, pidiendo qué se hizo. */
export function ResolveReviewDialog({ review, onClose }: ResolveReviewDialogProps) {
  return (
    <Dialog
      open={review !== null}
      onClose={onClose}
      title="Marcar como corregido"
      description="El aviso deja de mostrarse en las fichas. Anote qué corrigió, o por qué no había que corregir nada."
      bare
    >
      {review && <ResolveForm key={review.id} review={review} onDone={onClose} />}
    </Dialog>
  )
}

function ResolveForm({ review, onDone }: { review: DataReview; onDone(): void }) {
  const toast = useToast()
  const resolve = useResolveReview()
  const [resolution, setResolution] = useState('')
  const valid = resolution.trim().length >= 5

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!valid) return
    resolve.mutate(
      { id: review.id, resolution: resolution.trim() },
      {
        onSuccess: () => {
          toast.show('Aviso marcado como corregido')
          onDone()
        },
      },
    )
  }

  return (
    <form className="dialog__form" onSubmit={handleSubmit}>
      <div className="dialog__body">
        {resolve.isError && <Alert tone="error">{getErrorMessage(resolve.error)}</Alert>}
        <p className="small m-0">{review.message}</p>
        <TextAreaField
          label="¿Qué se corrigió?"
          hint="Por ejemplo: «Madre corregida a 55 JADE según la planilla» o «Verificado: el sistema estaba bien»."
          required
          minLength={5}
          maxLength={1000}
          autoFocus
          value={resolution}
          onChange={(e) => setResolution(e.target.value)}
        />
      </div>
      <footer className="dialog__footer">
        <Button variant="secondary" onClick={onDone} disabled={resolve.isPending}>
          Cancelar
        </Button>
        <Button type="submit" icon="check" loading={resolve.isPending} disabled={!valid}>
          Marcar como corregido
        </Button>
      </footer>
    </form>
  )
}
