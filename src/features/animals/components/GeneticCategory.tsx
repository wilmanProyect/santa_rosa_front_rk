import { useState, type FormEvent } from 'react'
import { useAuth } from '@/features/auth'
import { getErrorMessage } from '@/shared/api/api-error'
import { PERMISSIONS } from '@/shared/config/permissions'
import { formatDate, optional, todayIso } from '@/shared/lib/format'
import {
  Alert,
  Badge,
  Button,
  Dialog,
  Icon,
  SelectField,
  Spinner,
  TextAreaField,
  TextField,
  useToast,
} from '@/shared/ui'
import { geneticCategoryShort } from '../lib/genetic-category'
import { useConfirmGeneticCategory, useGeneticCategoryHistory } from '../hooks/useAnimals'
import {
  GENETIC_CATEGORY_CHANGE_LABELS,
  GENETIC_CATEGORY_LABELS,
  GENETIC_CATEGORY_ORDER,
  type AnimalDetail,
  type GeneticCategory,
} from '../types/animal.types'

interface GeneticCategoryTextProps {
  category: GeneticCategory | null
  confirmed?: boolean
  /** Etiqueta larga ("Grado 1 (G1)") en lugar del código. */
  long?: boolean
}

/**
 * Categoría genética. La esperada (calculada al nacer, sin confirmar por ABSID) se
 * muestra distinta: "G1 · esperada" en gris.
 */
export function GeneticCategoryText({ category, confirmed = true, long = false }: GeneticCategoryTextProps) {
  if (!category) return <span className="muted">—</span>
  const label = long ? GENETIC_CATEGORY_LABELS[category] : geneticCategoryShort(category)
  if (confirmed) return <>{label}</>
  return (
    <span className="muted" title="Calculada por los padres al nacer; falta que ABSID la confirme">
      {label} · esperada
    </span>
  )
}

/** Tarjeta de la ficha: categoría, confirmación por ABSID e historial de cambios. */
export function GeneticCategoryCard({ animal }: { animal: AnimalDetail }) {
  const { can } = useAuth()
  const [confirming, setConfirming] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const history = useGeneticCategoryHistory(animal.id, { enabled: showHistory })
  const canConfirm = can(PERMISSIONS.ANIMALS_CONFIRM_GENETIC_CATEGORY) && !animal.isExternal
  const pending = animal.geneticCategory !== null && !animal.geneticCategoryConfirmed

  return (
    <section className="card">
      <header className="card__header">
        <div>
          <h2>Categoría genética</h2>
          <p>
            {animal.geneticCategory === null
              ? 'Sin clasificar.'
              : pending
                ? 'Esperada según los padres: falta que ABSID la confirme.'
                : 'Confirmada (ABSID o cargada del certificado).'}
          </p>
        </div>
        <div className="row">
          <Button variant="ghost" size="sm" icon="activity" onClick={() => setShowHistory((v) => !v)}>
            {showHistory ? 'Ocultar historial' : 'Historial'}
          </Button>
          {canConfirm && (
            <Button
              variant={pending ? 'primary' : 'secondary'}
              size="sm"
              icon="check"
              onClick={() => setConfirming(true)}
            >
              {pending ? 'Confirmar categoría' : 'Registrar confirmación'}
            </Button>
          )}
        </div>
      </header>
      <div className="card__body stack">
        <div className="row" style={{ gap: 10 }}>
          <strong style={{ fontSize: '1.4rem' }}>
            <GeneticCategoryText
              category={animal.geneticCategory}
              confirmed={animal.geneticCategoryConfirmed}
              long
            />
          </strong>
          {animal.geneticCategory &&
            (pending ? <Badge tone="warning">Sin confirmar</Badge> : <Badge tone="success">Confirmada</Badge>)}
          {animal.absidCertificateCode && (
            <span className="muted small">Certificado {animal.absidCertificateCode}</span>
          )}
        </div>

        {showHistory && (
          <>
            {history.isPending && <Spinner />}
            {history.isError && <Alert tone="error">{getErrorMessage(history.error)}</Alert>}
            {history.data && history.data.length === 0 && (
              <p className="m-0 muted small">Sin cambios registrados.</p>
            )}
            {history.data && history.data.length > 0 && (
              <ol className="timeline">
                {[...history.data].reverse().map((c) => (
                  <li key={c.id}>
                    <strong>
                      {c.fromCategory ? geneticCategoryShort(c.fromCategory) : 'Sin categoría'}
                      {' → '}
                      {c.toCategory ? geneticCategoryShort(c.toCategory) : 'Sin categoría'}
                    </strong>
                    <span className="muted small">
                      {GENETIC_CATEGORY_CHANGE_LABELS[c.kind]} · {formatDate(c.changedOn)}
                      {c.absidCertificateCode && ` · Certificado ${c.absidCertificateCode}`}
                    </span>
                    {c.notes && <span className="small">{c.notes}</span>}
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
      </div>

      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Confirmar categoría genética"
        description="Según el certificado de ABSID."
        bare
      >
        <ConfirmCategoryForm key={String(confirming)} animal={animal} onDone={() => setConfirming(false)} />
      </Dialog>
    </section>
  )
}

function ConfirmCategoryForm({ animal, onDone }: { animal: AnimalDetail; onDone(): void }) {
  const toast = useToast()
  const confirm = useConfirmGeneticCategory()
  const [category, setCategory] = useState<GeneticCategory | ''>(animal.geneticCategory ?? '')
  const [confirmedOn, setConfirmedOn] = useState(todayIso())
  const [certificate, setCertificate] = useState(animal.absidCertificateCode ?? '')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (!category) {
      setError('Elija la categoría que figura en el certificado.')
      return
    }
    confirm.mutate(
      {
        id: animal.id,
        body: {
          // Si es la misma, se omite: la API confirma la actual.
          category: category === animal.geneticCategory ? undefined : category,
          confirmedOn,
          absidCertificateCode: optional(certificate),
          notes: optional(notes),
        },
      },
      {
        onSuccess: (result) => {
          toast.show(`Categoría confirmada: ${geneticCategoryShort(result.geneticCategory)}`)
          onDone()
        },
      },
    )
  }

  const changed = animal.geneticCategory !== null && category !== '' && category !== animal.geneticCategory

  return (
    <form className="dialog__form" onSubmit={handleSubmit}>
      <div className="dialog__body">
        {(error || confirm.isError) && <Alert tone="error">{error ?? getErrorMessage(confirm.error)}</Alert>}
        <SelectField
          label="Categoría"
          required
          value={category}
          hint={
            animal.geneticCategoryConfirmed
              ? undefined
              : 'Precargada con la esperada. Cámbiela si ABSID asignó otra.'
          }
          onChange={(e) => setCategory(e.target.value as GeneticCategory | '')}
        >
          <option value="">Elija…</option>
          {GENETIC_CATEGORY_ORDER.map((c) => (
            <option key={c} value={c}>
              {GENETIC_CATEGORY_LABELS[c]}
            </option>
          ))}
        </SelectField>
        {changed && (
          <Alert tone="warning">
            <Icon name="alert" size={16} /> ABSID asignó una categoría distinta de la esperada (
            {geneticCategoryShort(animal.geneticCategory!)}).
          </Alert>
        )}
        <div className="grid-2">
          <TextField
            label="Fecha de confirmación"
            type="date"
            required
            value={confirmedOn}
            min={animal.birthDate ?? undefined}
            max={todayIso()}
            onChange={(e) => setConfirmedOn(e.target.value)}
          />
          <TextField
            label="Código del certificado ABSID"
            maxLength={50}
            value={certificate}
            onChange={(e) => setCertificate(e.target.value)}
          />
        </div>
        <TextAreaField label="Observaciones" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <footer className="dialog__footer">
        <Button variant="secondary" onClick={onDone} disabled={confirm.isPending}>
          Cancelar
        </Button>
        <Button type="submit" icon="check" loading={confirm.isPending}>
          Confirmar
        </Button>
      </footer>
    </form>
  )
}
