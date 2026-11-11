import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router'
import { ANIMALS_ROUTES, SEX_LABELS, SPECIES_LABELS, animalLabel } from '@/features/animals'
import { Can } from '@/features/auth'
import { ReviewBanner } from '@/features/reviews'
import { getErrorMessage } from '@/shared/api/api-error'
import { PERMISSIONS } from '@/shared/config/permissions'
import { formatDate, formatDateTime, formatKg, nullable } from '@/shared/lib/format'
import {
  Alert,
  Badge,
  Button,
  DataItem,
  Dialog,
  Icon,
  PageHeader,
  SelectField,
  Spinner,
  TextAreaField,
  useToast,
} from '@/shared/ui'
import { AnimalRefLink, LitterBadge } from '../components/ReproductionBadges'
import { useBirth, useUpdateBirth } from '../hooks/useReproduction'
import { REPRODUCTION_ROUTES } from '../routes'
import {
  BIRTH_ASSISTANCE_LABELS,
  type Birth,
  type BirthAssistance,
  type UpdateBirthRequest,
} from '../types/reproduction.types'
import './reproduction.css'

function BackLink() {
  return (
    <Link to={REPRODUCTION_ROUTES.births}>
      <Icon name="arrowLeft" size={14} /> Partos
    </Link>
  )
}

export function BirthDetailPage() {
  const { birthId } = useParams()
  const { data, isPending, isError, error } = useBirth(birthId)

  if (isError) {
    return (
      <>
        <BackLink />
        <Alert tone="error">{getErrorMessage(error)}</Alert>
      </>
    )
  }
  if (isPending) return <Spinner />
  return <BirthView birth={data} />
}

function BirthView({ birth }: { birth: Birth }) {
  const [editing, setEditing] = useState(false)

  return (
    <>
      <PageHeader
        eyebrow={<BackLink />}
        title={
          <span>
            Parto de {animalLabel(birth.dam)}
            <span className="row" style={{ marginTop: 8, gap: 6 }}>
              <LitterBadge type={birth.litterType} size={birth.litterSize} />
              {birth.isHistorical && <Badge tone="neutral">Histórico</Badge>}
              <span className="muted small" style={{ fontWeight: 600 }}>
                {SPECIES_LABELS[birth.species]} · {formatDate(birth.birthDate)}
              </span>
            </span>
          </span>
        }
        actions={
          <Can permissions={[PERMISSIONS.REPRODUCTION_WRITE]}>
            <Button variant="secondary" icon="edit" onClick={() => setEditing(true)}>
              Corregir
            </Button>
          </Can>
        }
      />

      <div className="stack">
        <ReviewBanner entityType="BIRTH" entityId={birth.id} />
        {birth.isHistorical && (
          <Alert tone="info">
            Parto histórico: lo reconstruyó la migración agrupando las crías con la misma madre y fecha de
            nacimiento. No tiene monta y todas sus crías figuran como vivas.
          </Alert>
        )}

        <section className="card">
          <header className="card__header">
            <h2>Parto</h2>
          </header>
          <div className="card__body">
            <dl className="data-list">
              <DataItem label="Madre" value={<AnimalRefLink animal={birth.dam} showCategory />} />
              <DataItem
                label="Padre"
                value={birth.sire ? <AnimalRefLink animal={birth.sire} showCategory /> : null}
              />
              <DataItem label="Fecha" value={formatDate(birth.birthDate)} />
              <DataItem label="Tipo de parto" value={birth.assistance && BIRTH_ASSISTANCE_LABELS[birth.assistance]} />
              <DataItem label="Crías vivas" value={String(birth.bornAlive)} />
              <DataItem label="Nacidas muertas" value={String(birth.bornDead)} />
              <DataItem
                label="Monta"
                value={
                  birth.serviceId ? (
                    <Link to={REPRODUCTION_ROUTES.serviceDetail(birth.serviceId)}>Ver la monta</Link>
                  ) : (
                    <span className="muted">Sin monta registrada</span>
                  )
                }
              />
            </dl>
          </div>
        </section>

        <section className="card">
          <header className="card__header">
            <div>
              <h2>Crías</h2>
              <p>Los datos de cada cría se corrigen en su ficha.</p>
            </div>
          </header>
          <div className="table-wrap" style={{ border: 0, borderRadius: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Cría</th>
                  <th>Sexo</th>
                  <th>Peso al nacer</th>
                  <th>Estado al nacer</th>
                </tr>
              </thead>
              <tbody>
                {birth.offspring.map((o) => (
                  <tr key={o.position}>
                    <td>{o.position}</td>
                    <td>
                      {o.animal ? (
                        <Link to={ANIMALS_ROUTES.detail(o.animal.id)} className="table__primary">
                          {animalLabel(o.animal)}
                        </Link>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>{o.sex ? SEX_LABELS[o.sex] : <span className="muted">—</span>}</td>
                    <td>{formatKg(o.birthWeightKg)}</td>
                    <td>
                      {o.bornAlive ? <Badge tone="success">Viva</Badge> : <Badge tone="danger">Nacida muerta</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {birth.notes && (
          <section className="card">
            <header className="card__header">
              <h2>Observaciones</h2>
            </header>
            <div className="card__body">
              <p className="m-0" style={{ whiteSpace: 'pre-wrap' }}>
                {birth.notes}
              </p>
            </div>
          </section>
        )}

        <p className="m-0 muted small">
          Registrado el {formatDateTime(birth.createdAt)} · última modificación {formatDateTime(birth.updatedAt)}
        </p>
      </div>

      <Dialog
        open={editing}
        onClose={() => setEditing(false)}
        title="Corregir parto"
        description="Aquí solo se corrigen el tipo de parto y las observaciones. Las crías y los padres se corrigen en la ficha de cada animal."
        bare
      >
        <EditBirthForm birth={birth} onDone={() => setEditing(false)} />
      </Dialog>
    </>
  )
}

function EditBirthForm({ birth, onDone }: { birth: Birth; onDone(): void }) {
  const toast = useToast()
  const update = useUpdateBirth()
  const [assistance, setAssistance] = useState<BirthAssistance | ''>(birth.assistance ?? '')
  const [notes, setNotes] = useState(birth.notes ?? '')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const body: UpdateBirthRequest = {}
    if ((assistance || null) !== birth.assistance) body.assistance = assistance || null
    if (nullable(notes) !== birth.notes) body.notes = nullable(notes)
    if (Object.keys(body).length === 0) {
      onDone()
      return
    }
    update.mutate(
      { id: birth.id, body },
      {
        onSuccess: () => {
          toast.show('Parto corregido')
          onDone()
        },
      },
    )
  }

  return (
    <form className="dialog__form" onSubmit={handleSubmit}>
      <div className="dialog__body">
        {update.isError && <Alert tone="error">{getErrorMessage(update.error)}</Alert>}
        <SelectField
          label="Tipo de parto"
          value={assistance}
          onChange={(e) => setAssistance(e.target.value as BirthAssistance | '')}
        >
          <option value="">Sin indicar</option>
          {(Object.keys(BIRTH_ASSISTANCE_LABELS) as BirthAssistance[]).map((a) => (
            <option key={a} value={a}>
              {BIRTH_ASSISTANCE_LABELS[a]}
            </option>
          ))}
        </SelectField>
        <TextAreaField label="Observaciones" maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <footer className="dialog__footer">
        <Button variant="secondary" onClick={onDone} disabled={update.isPending}>
          Cancelar
        </Button>
        <Button type="submit" loading={update.isPending}>
          Guardar
        </Button>
      </footer>
    </form>
  )
}
